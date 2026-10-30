import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { usesCurrentRequirements, verifyDependencies, verifyRun } from "./verify_devpack_smoke.mjs";

const release = "devpack-installer-0.1.5";
const azd = "azd version 1.34.0 (commit example) (stable)\n";
const finished = "[Information] foundry-devpack: Finished (failed=0, cancelled=False) deferred=False";
const canvas = "[Information] foundry-devpack: Installed Microsoft Foundry Copilot Plugin";
const consoleCanvas = "Done: Installing Foundry Canvas (preview) for GitHub Copilot App";
const consoleSuccess = "SUCCESS: Foundry DevPack is installed.";
const extensions = () => [
  { id: "microsoft.foundry", installedVersion: "1.0.0-beta.2", version: "1.0.0-beta.2", updateAvailable: false },
  { id: "azure.ai.agents", installedVersion: "1.0.0-beta.15", version: "1.0.0-beta.15", updateAvailable: false },
  { id: "azure.ai.projects", installedVersion: "1.0.0-beta.10", version: "1.0.0-beta.10", updateAvailable: false },
];

async function windowsWorkflowScript(name) {
  const workflow = (await readFile(
    new URL("../workflows/verify-devpack-scripts.yml", import.meta.url), "utf8",
  )).replace(/\r\n/g, "\n");
  const windows = workflow.slice(workflow.indexOf("\n  windows:"), workflow.indexOf("\n  linux:"));
  const start = windows.indexOf(`      - name: ${name}\n`);
  assert.ok(start >= 0, `Windows workflow step not found: ${name}`);
  const step = windows.slice(start);
  const block = step.match(/        run: \|\n([\s\S]*?)(?=\n      - name:)/);
  assert.ok(block, `Windows workflow step not found: ${name}`);
  return block[1].replace(/^          /gm, "");
}

test("Windows with-code setup resolves MSI and portable Copilot installs and surfaces failures",
  { skip: process.platform !== "win32" }, async t => {
    const root = await mkdtemp(join(tmpdir(), "devpack-windows-setup-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const script = await windowsWorkflowScript("Install VS Code, Copilot CLI, and Claude shim");
    const githubPath = join(root, "github-path.txt");
    const shim = `
      function winget {
        $global:LASTEXITCODE = if ($args -contains $env:TEST_FAILED_PACKAGE) { 23 } else { 0 }
      }
      function Get-Command {
        param($Name, $CommandType, $ErrorAction)
        if ($Name -ne 'copilot' -or $CommandType -ne 'Application' -or $ErrorAction -ne 'Stop') {
          throw 'Copilot must be resolved as an application'
        }
        $persistedPath = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
          [Environment]::GetEnvironmentVariable('Path', 'User') + ';'
        if (-not $env:Path.StartsWith($persistedPath)) { throw 'PATH was not refreshed' }
        if ($env:TEST_MISSING_COPILOT -eq '1') { throw 'Copilot application not found' }
        [pscustomobject]@{ Source = Join-Path $env:TEST_COPILOT_BIN 'copilot.exe' }
      }
    `;
    const run = options => spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", shim + script], {
      env: {
        ...process.env, RUNNER_TEMP: root, LOCALAPPDATA: root, GITHUB_PATH: githubPath,
        TEST_FAILED_PACKAGE: "", TEST_MISSING_COPILOT: "0", ...options,
      },
      encoding: "utf8",
      timeout: 10_000,
    });
    for (const location of ["Program Files\\GitHub Copilot", "Microsoft\\WinGet\\Packages\\GitHub.Copilot_test"]) {
      const bin = join(root, location);
      const result = run({ TEST_COPILOT_BIN: bin });
      assert.equal(result.status, 0, result.stderr);
      const paths = (await readFile(githubPath, "utf8")).trim().split(/\r?\n/);
      assert.deepEqual(paths, [
        join(root, "Programs", "Microsoft VS Code", "bin"), bin, join(root, "claude-bin"),
      ]);
      assert.equal(await readFile(join(root, "claude-bin", "claude.cmd"), "utf8"), "@echo off\r\nexit /b 0\r\n");
      await rm(githubPath);
    }
    for (const [options, message] of [
      [{ TEST_FAILED_PACKAGE: "Microsoft.VisualStudioCode" }, /VS Code install exited 23/],
      [{ TEST_FAILED_PACKAGE: "GitHub.Copilot" }, /Copilot CLI install exited 23/],
      [{ TEST_MISSING_COPILOT: "1" }, /Copilot application not found/],
    ]) {
      const result = run(options);
      assert.notEqual(result.status, 0, result.stdout);
      assert.match(result.stderr, message);
    }
  });

test("Windows bootstrap cleanup handles skipped setup, missing files, and repeated cleanup",
  { skip: process.platform !== "win32" }, async t => {
    const root = await mkdtemp(join(tmpdir(), "devpack-windows-cleanup-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const script = await windowsWorkflowScript("Remove trusted publisher and bootstrap");
    const bootstrap = join(root, "bootstrap [signed].ps1");
    const run = path => spawnSync("pwsh", [
      "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "$ErrorActionPreference = 'Stop'\n" + script,
    ], {
      env: { ...process.env, DEVPACK_SCRIPT: path, SIGNER_THUMBPRINT: "", SIGNER_WAS_TRUSTED: "" },
      encoding: "utf8",
      timeout: 10_000,
    });
    for (const path of ["", bootstrap]) {
      const result = run(path);
      assert.equal(result.status, 0, result.stderr);
    }
    await writeFile(bootstrap, "test bootstrap");
    const result = run(bootstrap);
    assert.equal(result.status, 0, result.stderr);
    await assert.rejects(readFile(bootstrap), { code: "ENOENT" });
    const repeated = run(bootstrap);
    assert.equal(repeated.status, 0, repeated.stderr);
  });

test("release gates compare versions numerically and include the new release's prereleases", () => {
  for (const version of ["0.0.9", "0.1.3", "0.1.4"]) {
    assert.equal(usesCurrentRequirements(`devpack-installer-${version}`), false);
  }
  for (const version of ["0.1.5", "0.1.5-rc.1", "0.1.10", "0.2.0", "1.0.0"]) {
    assert.equal(usesCurrentRequirements(`devpack-installer-${version}`), true);
  }
  for (const tag of ["0.1.5", "devpack-installer-invalid", "devpack-installer-0.1"]) {
    assert.throws(() => usesCurrentRequirements(tag));
  }
});

test("successful Canvas run is required independently of installed plugin presence", () => {
  verifyRun(release, "with-code", "log", `${canvas}\n${finished}`);
  assert.throws(() => verifyRun(release, "with-code", "log", finished), /Canvas/);
  assert.throws(
    () => verifyRun(release, "with-code", "log", `Installed plugins: microsoft-foundry@awesome-copilot\n${finished}`),
    /Canvas/,
  );
});

test("zero-exit deferred Canvas, timeout, or auth errors fail smoke", () => {
  for (const reason of ["unexpected argument '--no-color' found", "timed out", "sign in"]) {
    const output = `[Warning] foundry-devpack: Deferred Microsoft Foundry Copilot Plugin ${reason}\n` +
      finished.replace("deferred=False", "deferred=True");
    assert.throws(() => verifyRun(release, "with-code", "log", output), /deferred work/);
  }
});

test("required-component failure, cancellation, and missing summary fail log validation", () => {
  for (const output of [
    `${canvas}\n${finished.replace("failed=0", "failed=1")}`,
    `${canvas}\n${finished.replace("cancelled=False", "cancelled=True")}`,
    canvas,
    "",
  ]) {
    assert.throws(() => verifyRun(release, "with-code", "log", output), /successful run/);
  }
});

test("baseline and no-az scenarios can skip Canvas but not defer required work", () => {
  for (const scenario of ["baseline", "no-az"]) {
    verifyRun(release, scenario, "log", finished);
    assert.throws(
      () => verifyRun(release, scenario, "log", finished.replace("deferred=False", "deferred=True")),
      /deferred work/,
    );
    verifyRun(release, scenario, "console", consoleSuccess);
  }
});

test("AKA and brew console output must show a successful Canvas group and final success", () => {
  verifyRun(release, "with-code", "console", `${consoleCanvas}\n${consoleSuccess}`);
  verifyRun(
    release, "with-code", "console",
    `\x1b[32m(\u2713) Done:\x1b[0m Installing Foundry Canvas (preview) for GitHub Copilot App\r\n${consoleSuccess}\r\n`,
  );
  for (const output of [
    consoleSuccess,
    `${consoleCanvas.replace("Done:", "Pending:")}\nALMOST DONE: Complete the pending action above.`,
    `${consoleCanvas}\nALMOST DONE: Complete the pending action above.`,
    `${consoleCanvas}\n${consoleSuccess}\nALMOST DONE: Complete the pending action above.`,
  ]) {
    assert.throws(() => verifyRun(release, "with-code", "console", output));
  }
});

test("older releases retain their existing log and console expectations", () => {
  const old = "devpack-installer-0.1.4";
  verifyRun(old, "with-code", "log", finished.replace("deferred=False", "deferred=True"));
  verifyRun(old, "with-code", "console", "historical console output");
  assert.throws(() => verifyRun(old, "with-code", "log", "failed"), /successful run/);
});

test("invalid scenarios and output formats do not silently skip checks", () => {
  assert.throws(() => verifyRun(release, "typo", "log", finished), /scenario/);
  assert.throws(() => verifyRun(release, "baseline", "typo", finished), /format/);
});

test("new releases require azd at or above the stable baseline", () => {
  for (const version of ["1.34.0", "1.34.1", "1.35.0", "1.100.0", "2.0.0"]) {
    verifyDependencies(release, `azd version ${version} (stable)`, extensions());
  }
  for (const version of ["1.31.2", "1.32.0", "1.33.9", "1.34.0-beta.1"]) {
    assert.throws(
      () => verifyDependencies(release, `azd version ${version}`, extensions()),
      /below the required/,
    );
  }
  assert.throws(() => verifyDependencies(release, "unknown", extensions()), /parse azd/);
});

test("older releases do not inherit new version or reconciliation requirements", () => {
  const stale = extensions();
  stale[1].installedVersion = "1.0.0-beta.12";
  stale[1].updateAvailable = true;
  verifyDependencies("devpack-installer-0.1.4", "azd version 1.31.2", stale);
});

test("both Foundry and agents must really be installed, not just appear in text", () => {
  for (const id of ["microsoft.foundry", "azure.ai.agents"]) {
    assert.throws(
      () => verifyDependencies(release, azd, extensions().filter(item => item.id !== id)),
      /not installed/,
    );
    const missingVersion = extensions();
    missingVersion.find(item => item.id === id).installedVersion = "";
    assert.throws(() => verifyDependencies(release, azd, missingVersion), /not installed/);
  }
  assert.throws(() => verifyDependencies(release, azd, {}), /JSON array/);
});

test("all installed Foundry dependencies must be current, even when updates are marked incompatible", () => {
  for (const index of [0, 1, 2]) {
    const stale = extensions();
    stale[index].installedVersion = "1.0.0-beta.1";
    assert.throws(() => verifyDependencies(release, azd, stale), /not current/);
    const pending = extensions();
    pending[index].updateAvailable = true;
    assert.throws(() => verifyDependencies(release, azd, pending), /not current/);
  }
});

test("future registry versions are allowed without pinning and unrelated extensions are ignored", () => {
  const future = extensions().map(item => ({ ...item, installedVersion: "2.0.0", version: "2.0.0" }));
  future.push({ id: "azure.appservice", installedVersion: "0.1.0", version: "0.2.0", updateAvailable: true });
  verifyDependencies(release, azd, future);
});

test("incomplete extension JSON does not pass reconciliation checks", () => {
  for (const field of ["version", "updateAvailable"]) {
    const incomplete = extensions();
    delete incomplete[1][field];
    assert.throws(() => verifyDependencies(release, azd, incomplete), /not current/);
  }
  assert.throws(() => verifyDependencies(release, azd, [...extensions(), null]), /missing an id/);
});

test("CLI validates UTF-8 BOM input and returns nonzero on errors or missing files", async () => {
  const root = await mkdtemp(join(tmpdir(), "devpack-smoke-test-"));
  const script = fileURLToPath(new URL("./verify_devpack_smoke.mjs", import.meta.url));
  const invoke = args => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  try {
    const versionPath = join(root, "azd.txt");
    const extensionsPath = join(root, "extensions.json");
    const outputPath = join(root, "installer.log");
    await writeFile(versionPath, azd);
    await writeFile(extensionsPath, `\uFEFF${JSON.stringify(extensions())}`);
    const deps = ["dependencies", release, versionPath, extensionsPath];
    assert.equal(invoke(deps).status, 0);
    await writeFile(extensionsPath, "malformed");
    assert.equal(invoke(deps).status, 1);
    await writeFile(outputPath, `${canvas}\n${finished}`);
    assert.equal(invoke(["run", release, "with-code", "log", outputPath]).status, 0);
    await writeFile(outputPath, finished);
    assert.equal(invoke(["run", release, "with-code", "log", outputPath]).status, 1);
    assert.equal(invoke(["run", release, "with-code", "log", join(root, "missing")]).status, 1);
    assert.equal(invoke([]).status, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
