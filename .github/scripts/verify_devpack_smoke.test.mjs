import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
