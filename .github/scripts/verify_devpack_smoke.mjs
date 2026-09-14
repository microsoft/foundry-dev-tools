import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (!match) {
    throw new Error(`Invalid version: ${value}`);
  }
  const core = match.slice(1, 4).map(Number);
  if (!core.every(Number.isSafeInteger)) {
    throw new Error(`Invalid version: ${value}`);
  }
  return { core, prerelease: match[4] };
}

function compareCore(left, right) {
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

export function usesCurrentRequirements(releaseTag) {
  const prefix = "devpack-installer-";
  if (!releaseTag.startsWith(prefix)) {
    throw new Error(`Invalid DevPack release tag: ${releaseTag}`);
  }
  // Apply the new contract to 0.1.5 prereleases too, but not historical releases.
  return compareCore(parseVersion(releaseTag.slice(prefix.length)).core, [0, 1, 5]) >= 0;
}

export function verifyRun(releaseTag, scenario, format, output) {
  if (!["baseline", "no-az", "with-code"].includes(scenario)) {
    throw new Error(`Invalid smoke scenario: ${scenario}`);
  }
  if (!["log", "console"].includes(format)) {
    throw new Error(`Invalid installer output format: ${format}`);
  }
  const current = usesCurrentRequirements(releaseTag);
  const text = output.replace(/\x1b\[[0-9;]*m/g, "");

  if (format === "log" && !text.includes("Finished (failed=0, cancelled=False)")) {
    throw new Error("Installer log does not contain the successful run result");
  }
  if (!current) {
    return;
  }

  if (format === "log") {
    if (!text.includes("Finished (failed=0, cancelled=False) deferred=False")) {
      throw new Error("Installer has deferred work; exit code 0 alone is not sufficient");
    }
    if (scenario === "with-code" &&
        !/\[Information\] foundry-devpack: Installed Microsoft Foundry Copilot Plugin(?:\s|$)/m.test(text)) {
      throw new Error("Canvas did not install successfully in this run");
    }
  } else {
    if (!text.includes("SUCCESS: Foundry DevPack is installed.") || text.includes("ALMOST DONE:")) {
      throw new Error("Installer output does not report a fully successful setup");
    }
    if (scenario === "with-code" &&
        !/^(?:\(\u2713\) )?Done: Installing Foundry Canvas \(preview\) for GitHub Copilot App\r?$/m.test(text)) {
      throw new Error("Canvas did not install successfully in this run");
    }
  }
}

export function verifyDependencies(releaseTag, azdOutput, extensions) {
  const current = usesCurrentRequirements(releaseTag);
  if (!Array.isArray(extensions)) {
    throw new Error("Installed azd extensions must be a JSON array");
  }
  for (const id of ["microsoft.foundry", "azure.ai.agents"]) {
    const installed = extensions.find(item => item?.id === id);
    if (!installed || typeof installed.installedVersion !== "string" || !installed.installedVersion.trim()) {
      throw new Error(`${id} is not installed`);
    }
  }
  if (!current) {
    return;
  }

  const match = /^azd version (\S+)/m.exec(azdOutput);
  if (!match) {
    throw new Error("Could not parse azd version output");
  }
  const azd = parseVersion(match[1]);
  const comparison = compareCore(azd.core, [1, 34, 0]);
  if (comparison < 0 || (comparison === 0 && azd.prerelease)) {
    throw new Error(`azd ${match[1]} is below the required stable 1.34.0`);
  }

  for (const extension of extensions) {
    if (typeof extension?.id !== "string") {
      throw new Error("Installed azd extension data is missing an id");
    }
    if (extension.id !== "microsoft.foundry" && !extension.id.startsWith("azure.ai.")) {
      continue;
    }
    if (typeof extension.version !== "string" || !extension.version.trim() ||
        extension.installedVersion !== extension.version || extension.updateAvailable !== false) {
      throw new Error(
        `${extension.id} is not current: installed=${extension.installedVersion}, ` +
        `latest=${extension.version}, updateAvailable=${extension.updateAvailable}`,
      );
    }
  }
}

async function main([mode, ...args]) {
  if (mode === "run" && args.length === 4) {
    const [releaseTag, scenario, format, path] = args;
    verifyRun(releaseTag, scenario, format, await readFile(path, "utf8"));
  } else if (mode === "dependencies" && args.length === 3) {
    const [releaseTag, versionPath, extensionsPath] = args;
    const version = await readFile(versionPath, "utf8");
    const extensions = JSON.parse((await readFile(extensionsPath, "utf8")).replace(/^\uFEFF/, ""));
    verifyDependencies(releaseTag, version, extensions);
  } else {
    throw new Error(
      "Usage: verify_devpack_smoke.mjs run <release-tag> <scenario> <log|console> <output-file>\n" +
      "   or: verify_devpack_smoke.mjs dependencies <release-tag> <azd-version-file> <extensions-json>",
    );
  }
  console.log(`DevPack ${mode} verification passed.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`DevPack smoke verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
