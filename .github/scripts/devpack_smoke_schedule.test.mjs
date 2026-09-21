import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildReport, issueMarker, issueTitle, prepare, prepareInputs, report, reportAction, selectRelease, sourceMatrices } from "./devpack_smoke_schedule.mjs";

const release = (tag, extras = {}) => ({ tag_name: tag, published_at: "2026-09-21T00:00:00Z", draft: false, ...extras });
// The workflow excludes Intel/no-az on macOS: five jobs per source instead of six.
const jobCount = matrix => Object.entries(matrix)
  .reduce((count, [os, sources]) => count + sources.length * (os === "macos" ? 5 : 6), 0);

test("selects newest numeric DevPack version, including GitHub prereleases", () => {
  assert.equal(selectRelease([
    release("other-product-99.0.0"),
    release("devpack-installer-0.1.9"),
    release("devpack-installer-0.1.10", { prerelease: true }),
    release("devpack-installer-0.2.0", { draft: true }),
    release("devpack-installer-0.3.0", { published_at: null }),
    release("devpack-installer-0.4.0-rc.1"),
  ]), "devpack-installer-0.1.10");
});

test("missing published DevPack is an error, not a fallback tag", () => {
  assert.throws(() => selectRelease([]), /No published DevPack/);
  assert.throws(() => selectRelease([release("other-1.0.0")]), /No published DevPack/);
});

test("daily matrix has 45 valid jobs across all four sources", () => {
  const matrix = sourceMatrices("all");
  assert.deepEqual(matrix, {
    windows: ["release", "winget", "aka"],
    linux: ["release", "aka"],
    macos: ["release", "brew", "aka"],
  });
  assert.equal(jobCount(matrix), 45);
});

test("single-source matrices retain OS coverage except macOS Intel/no-az", () => {
  for (const source of ["release", "aka"]) {
    const matrix = sourceMatrices(source);
    assert.equal(jobCount(matrix), 17);
  }
  assert.deepEqual(sourceMatrices("winget"), { windows: ["winget"], linux: [], macos: [] });
  assert.deepEqual(sourceMatrices("brew"), { windows: [], linux: [], macos: ["brew"] });
  assert.equal(jobCount(sourceMatrices("winget")), 6);
  assert.equal(jobCount(sourceMatrices("brew")), 5);
  assert.throws(() => sourceMatrices("homebrew"), /Invalid installation source/);
});

test("schedule resolves latest while a release event uses its exact tag", () => {
  assert.equal(prepareInputs("schedule", "", "", "").source, "all");
  assert.equal(prepareInputs("schedule", "", "", "").tag, "");
  const event = prepareInputs("release", "all", "", "devpack-installer-0.1.4");
  assert.equal(event.source, "release");
  assert.equal(event.tag, "devpack-installer-0.1.4");
});

test("manual inputs preserve pinned tags or request latest, including all-source dry runs", () => {
  const pinned = prepareInputs("workflow_dispatch", "winget", "devpack-installer-0.1.5", "");
  assert.equal(pinned.tag, "devpack-installer-0.1.5");
  assert.deepEqual(pinned.matrices.windows, ["winget"]);
  assert.equal(prepareInputs("workflow_dispatch", "all", "", "").tag, "");
  assert.throws(() => prepareInputs("workflow_dispatch", "all", "malformed\nvalue", ""), /Invalid DevPack/);
});

const success = () => Object.fromEntries(["prepare", "windows", "linux", "macos"].map(name => [name, { result: "success" }]));

test("first failure creates one issue and subsequent failures update it", () => {
  const results = success();
  results.windows.result = "failure";
  assert.equal(reportAction(results, undefined), "create");
  assert.equal(reportAction(results, { number: 1 }), "update");
});

test("only full recovery closes the issue; cancelled, skipped and missing jobs are not green", () => {
  assert.equal(reportAction(success(), { number: 1 }), "close");
  assert.equal(reportAction(success(), undefined), "none");
  for (const result of ["failure", "cancelled", "skipped", undefined]) {
    const results = success();
    results.prepare = result ? { result } : undefined;
    assert.equal(reportAction(results, { number: 1 }), "update");
  }
});

test("report identifies failures and records executed versions rather than assuming latest", () => {
  const text = buildReport(success(),
    [{ name: "windows | x64", conclusion: "failure", html_url: "https://github.com/job/1" }],
    [{
      source: "winget", platform: "win32", arch: "x64", scenario: "with-code",
      releaseTag: "devpack-installer-0.1.5", runnerImage: "windows2025 20260920",
      tools: { copilot: { output: "GitHub Copilot CLI 1.0.86.\n" }, azd: { output: "azd version 1.34.1\n" } },
    }], "https://github.com/run/1");
  assert.ok(text.includes(issueMarker));
  assert.ok(text.includes("windows   x64"));
  assert.ok(text.includes("GitHub Copilot CLI 1.0.86."));
  assert.ok(text.includes("azd version 1.34.1"));
  assert.equal(
    text.split("\n").find(line => line.startsWith("- [")),
    "- [windows   x64](https://github.com/job/1): failure",
  );
  assert.ok(!text.includes("undefined"));
});

test("report still describes setup failure without inventories", () => {
  const text = buildReport({ prepare: { result: "failure" } }, [], [], "https://github.com/run/1");
  assert.ok(text.includes("| prepare | failure |"));
  assert.ok(text.includes("| windows | unknown |"));
});

test("preparation paginates releases and emits the full matrix to Actions outputs", async t => {
  const root = await mkdtemp(join(tmpdir(), "devpack-schedule-"));
  const previousEnv = { ...process.env };
  t.after(async () => {
    process.env = previousEnv;
    await rm(root, { recursive: true, force: true });
  });
  Object.assign(process.env, {
    GITHUB_REPOSITORY: "test/repo", GITHUB_EVENT_NAME: "schedule",
    INPUT_TAG: "", INPUT_SOURCE: "", EVENT_RELEASE_TAG: "",
    GITHUB_OUTPUT: join(root, "outputs.txt"), GITHUB_STEP_SUMMARY: join(root, "summary.md"),
  });
  const requests = [];
  t.mock.method(globalThis, "fetch", async url => {
    requests.push(url);
    return {
      ok: true,
      json: async () => url.endsWith("page=1")
        ? Array.from({ length: 100 }, () => release("other-product-1.0.0"))
        : [release("devpack-installer-0.1.5", { prerelease: true })],
    };
  });
  await prepare();
  const output = await readFile(process.env.GITHUB_OUTPUT, "utf8");
  assert.equal(requests.length, 2);
  assert.ok(output.includes("release_tag=devpack-installer-0.1.5"));
  assert.ok(output.includes('windows_sources=["release","winget","aka"]'));
  assert.ok(output.includes('linux_sources=["release","aka"]'));
  assert.ok(output.includes('macos_sources=["release","brew","aka"]'));
});

test("reporting creates, updates, and closes only the tracking issue; manual all-source runs never write", async t => {
  const root = await mkdtemp(join(tmpdir(), "devpack-report-"));
  const previousEnv = { ...process.env };
  t.after(async () => {
    process.env = previousEnv;
    await rm(root, { recursive: true, force: true });
  });
  Object.assign(process.env, {
    GITHUB_REPOSITORY: "test/repo", GITHUB_RUN_ID: "123",
    GITHUB_STEP_SUMMARY: join(root, "summary.md"), SMOKE_ARTIFACTS: root,
  });
  const failed = success();
  failed.windows.result = "failure";
  let issues = [];
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, method: options.method, body: options.body && JSON.parse(options.body) });
    return {
      ok: true,
      json: async () => url.includes("/jobs?")
        ? { jobs: [{ name: "windows x64", conclusion: "failure", html_url: "https://github.com/job/1" }] }
        : url.includes("/issues?") ? issues : {},
    };
  });
  for (const [existing, enabled, results, expected] of [
    [false, false, failed, []],
    [false, true, failed, ["POST"]],
    [true, true, failed, ["PATCH"]],
    [true, true, success(), ["POST", "PATCH"]],
    [false, true, success(), []],
  ]) {
    // An unrelated issue with the same title but no marker must not be overwritten.
    issues = [{ number: 7, title: issueTitle, body: "User-authored issue" }];
    if (existing) issues.push({ number: 42, title: issueTitle, body: issueMarker });
    process.env.REPORT_ISSUE = String(enabled);
    process.env.SMOKE_RESULTS = JSON.stringify(results);
    requests.length = 0;
    await report();
    const writes = requests.filter(request => request.method !== "GET");
    assert.deepEqual(writes.map(request => request.method), expected);
    for (const request of writes) {
      assert.ok(!request.url.includes("/issues/7"));
    }
    if (existing && results.windows.result === "success") {
      assert.deepEqual(writes[1].body, { state: "closed", state_reason: "completed" });
    }
  }
});

test("API failures are surfaced instead of pretending resolution succeeded", async t => {
  const previousEnv = { ...process.env };
  t.after(() => { process.env = previousEnv; });
  Object.assign(process.env, { GITHUB_EVENT_NAME: "schedule", INPUT_TAG: "", INPUT_SOURCE: "" });
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 403 }));
  await assert.rejects(prepare(), /HTTP 403/);
});
