import { spawnSync } from "node:child_process";
import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const issueTitle = "DevPack daily smoke failures";
export const issueMarker = "<!-- devpack-daily-smoke -->";

export function selectRelease(releases) {
  const candidates = releases.filter(release =>
    !release.draft && release.published_at &&
    /^devpack-installer-\d+\.\d+\.\d+$/.test(release.tag_name));
  candidates.sort((a, b) => {
    const left = a.tag_name.slice("devpack-installer-".length).split(".").map(Number);
    const right = b.tag_name.slice("devpack-installer-".length).split(".").map(Number);
    for (let index = 0; index < 3; index++) {
      if (left[index] !== right[index]) return right[index] - left[index];
    }
    return 0;
  });
  if (!candidates.length) throw new Error("No published DevPack release found (including GitHub prereleases)");
  return candidates[0].tag_name;
}

export function sourceMatrices(source) {
  if (!["all", "release", "aka", "winget", "brew"].includes(source)) {
    throw new Error(`Invalid installation source: ${source}`);
  }
  const supported = {
    windows: ["release", "winget", "aka"],
    linux: ["release", "aka"],
    macos: ["release", "brew", "aka"],
  };
  return Object.fromEntries(Object.entries(supported).map(([os, sources]) =>
    [os, source === "all" ? sources : sources.filter(item => item === source)]));
}

export function prepareInputs(event, inputSource, inputTag, releaseTag) {
  const source = event === "schedule" ? "all" : event === "release" ? "release" : inputSource;
  const tag = event === "release" ? releaseTag : inputTag;
  if (tag && !/^devpack-installer-\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
    throw new Error(`Invalid DevPack release tag: ${tag}`);
  }
  return { source, tag, matrices: sourceMatrices(source) };
}

async function api(path, method = "GET", body) {
  const response = await fetch(`https://api.github.com/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
  return response.json();
}

async function paginate(path, property) {
  const items = [];
  for (let page = 1; ; page++) {
    const data = await api(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    const batch = property ? data[property] : data;
    if (!Array.isArray(batch)) throw new Error(`Invalid paginated response: ${path}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

export async function prepare() {
  const { source, tag, matrices } = prepareInputs(
    process.env.GITHUB_EVENT_NAME, process.env.INPUT_SOURCE || "release",
    process.env.INPUT_TAG || "", process.env.EVENT_RELEASE_TAG || "",
  );
  const selected = tag || selectRelease(await paginate(`repos/${process.env.GITHUB_REPOSITORY}/releases`));
  const outputs = { release_tag: selected };
  for (const [os, sources] of Object.entries(matrices)) {
    outputs[`${os}_sources`] = JSON.stringify(sources);
  }
  for (const [key, value] of Object.entries(outputs)) {
    await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
  await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `### DevPack smoke target\n- Release: ${selected}\n- Sources: ${source}\n` +
    "- Copilot: stable from the normal distribution sources\n" +
    "- Distribution lag is reported as a failure, not silently downgraded to an older DevPack.\n");
  console.log(JSON.stringify(outputs, null, 2));
}

async function collect() {
  const directory = join(process.env.RUNNER_TEMP, "devpack-diagnostics");
  await mkdir(directory, { recursive: true });
  const inventory = {
    releaseTag: process.env.RELEASE_TAG, source: process.env.INSTALL_SOURCE,
    scenario: process.env.SCENARIO, platform: process.platform, arch: process.arch,
    jobStatus: process.env.SMOKE_JOB_STATUS,
    runnerImage: `${process.env.ImageOS || "unknown"} ${process.env.ImageVersion || "unknown"}`,
    tools: {},
  };
  const tools = [
    ["azureCli", "az", ["version", "-o", "json"]],
    ["azd", "azd", ["version"]],
    ["extensions", "azd", ["ext", "list", "--installed", "-o", "json"]],
    ["copilot", "copilot", ["--version"]],
    ["plugins", "copilot", ["--no-color", "plugin", "list"]],
    ["vscode", "code", ["--list-extensions", "--show-versions"]],
  ];
  for (const [name, file, args] of tools) {
    // Only fixed commands are passed to cmd.exe, for Windows .cmd shims.
    const result = process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", `${file} ${args.join(" ")}`],
        { encoding: "utf8", timeout: 30_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true })
      : spawnSync(file, args, { encoding: "utf8", timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
    inventory.tools[name] = {
      exitCode: result.status, output: result.stdout || "", error: result.error?.message || result.stderr || "",
    };
  }
  await writeFile(join(directory, "inventory.json"), JSON.stringify(inventory, null, 2));
  await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `### ${inventory.source} / ${inventory.platform}-${inventory.arch} / ${inventory.scenario}\n` +
    `- Release: ${inventory.releaseTag}\n- Result before cleanup: ${inventory.jobStatus}\n` +
    `- Runner: ${inventory.runnerImage}\n- Version inventory and installer logs are retained in artifacts.\n`);
}

export function reportAction(results, issue) {
  const complete = ["prepare", "windows", "linux", "macos"].every(name => results[name]?.result === "success");
  if (complete) return issue ? "close" : "none";
  return issue ? "update" : "create";
}

function cell(value) {
  return String(value ?? "unknown").replace(/[\r\n|]/g, " ").replace(/</g, "&lt;").slice(0, 200);
}

export function buildReport(results, jobs, inventories, runUrl) {
  const lines = [
    issueMarker,
    "Daily smoke checks the newest published DevPack across release, AKA, WinGet, and Homebrew.",
    `Run: ${runUrl}`, "",
    "| Job group | Result |", "|---|---|",
    ...["prepare", "windows", "linux", "macos"].map(name =>
      `| ${name} | ${cell(results[name]?.result)} |`),
    "", "### Failed or incomplete jobs",
  ];
  const incomplete = jobs.filter(job => job.conclusion !== "success" && job.name !== "Report daily smoke");
  lines.push(...incomplete.map(job => `- [${cell(job.name)}](${job.html_url}): ${cell(job.conclusion || job.status)}`));
  lines.push("", "### Resolved versions", "| Source / platform / scenario | DevPack | Copilot | azd | Runner image |",
    "|---|---|---|---|---|");
  for (const item of inventories) {
    lines.push(`| ${cell(`${item.source} / ${item.platform}-${item.arch} / ${item.scenario}`)} | ` +
      `${cell(item.releaseTag)} | ${cell(item.tools?.copilot?.output?.trim())} | ` +
      `${cell(item.tools?.azd?.output?.trim())} | ${cell(item.runnerImage)} |`);
  }
  lines.push("", "Download the run artifacts for installer logs and the complete dependency inventory.",
    "A channel still serving an older DevPack is reported rather than silently skipped.");
  return lines.join("\n");
}

export async function report() {
  const repo = process.env.GITHUB_REPOSITORY;
  const runUrl = `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const results = JSON.parse(process.env.SMOKE_RESULTS);
  const jobs = await paginate(`repos/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}/jobs?filter=latest`, "jobs");
  const inventories = [];
  const directory = process.env.SMOKE_ARTIFACTS;
  if (directory) {
    const entries = await readdir(directory, { recursive: true }).catch(error => {
      if (error.code === "ENOENT") {
        console.warn("No diagnostic artifacts available; setup may have failed.");
        return [];
      }
      throw error;
    });
    for (const entry of entries.filter(path => path.endsWith("inventory.json"))) {
      inventories.push(JSON.parse(await readFile(join(directory, entry), "utf8")));
    }
  }
  const body = buildReport(results, jobs, inventories, runUrl);
  await appendFile(process.env.GITHUB_STEP_SUMMARY, body);
  if (process.env.REPORT_ISSUE !== "true") {
    console.log("Manual run: issue updates disabled.");
    return;
  }
  const issues = await paginate(`repos/${repo}/issues?state=open`);
  const issue = issues.find(item => !item.pull_request && item.title === issueTitle && item.body?.includes(issueMarker));
  const action = reportAction(results, issue);
  if (action === "create") {
    await api(`repos/${repo}/issues`, "POST", { title: issueTitle, body });
  } else if (action === "update") {
    await api(`repos/${repo}/issues/${issue.number}`, "PATCH", { body });
  } else if (action === "close") {
    await api(`repos/${repo}/issues/${issue.number}/comments`, "POST", { body: `Daily smoke recovered: ${runUrl}` });
    await api(`repos/${repo}/issues/${issue.number}`, "PATCH", { state: "closed", state_reason: "completed" });
  }
  console.log(`Daily smoke issue action: ${action}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const commands = { prepare, collect, report };
  const command = commands[process.argv[2]];
  Promise.resolve().then(() => {
    if (!command) throw new Error("Usage: devpack_smoke_schedule.mjs <prepare|collect|report>");
    return command();
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
