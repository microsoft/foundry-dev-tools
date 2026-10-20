import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourceRepository = "SmallBlackHole/foundry-orchestrator-agent";

export function releaseIdentity(version, environment, commit) {
  assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "Invalid CLI version");
  assert.ok(["dev", "test"].includes(environment), "Environment must be dev or test");
  assert.match(commit, /^[0-9a-f]{40}$/, "Expected a lowercase full source commit SHA");
  return {
    tag: `foundryx-v${version}-${environment}`,
    binary: `foundryx-${version}-${environment}-win32-x64.exe`,
  };
}

function releaseNotes(metadata) {
  return [
    "# FoundryX standalone CLI preview",
    "",
    `- CLI version: ${metadata.version}`,
    `- Service profile: ${metadata.environment}`,
    "- Platform: Windows x64 only",
    `- Source: ${sourceRepository}@${metadata.sourceCommit}`,
    `- Build runtime: ${metadata.node}`,
    "",
    "This executable is unsigned. It embeds Node.js and the CLI",
    "dependencies, including native keytar. No separate Node.js installation is needed.",
    "Runtime files are extracted to the user's FoundryX SEA cache and hash-checked.",
    "macOS, Linux and Windows ARM64 binaries are not included.",
    "",
    "Verify the executable against SHA256SUMS before use. Rename it to foundry.exe",
    "and place it in a user-owned directory on PATH if a bare foundry command is needed.",
    "",
  ].join("\n");
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function stageRelease(cliRoot, output, environment, commit) {
  const manifest = JSON.parse(await readFile(path.join(cliRoot, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(path.join(cliRoot, "package-lock.json"), "utf8"));
  const identity = releaseIdentity(manifest.version, environment, commit);
  assert.equal(lock.version, manifest.version, "CLI and lockfile versions differ");
  assert.equal(lock.packages[""].version, manifest.version, "Lockfile root version differs");
  assert.match(process.version, /^v24\./, "Stage the release using Node.js 24");
  const executable = path.join(cliRoot, "release", "binary", "win32-x64", "foundry.exe");
  const contents = await readFile(executable);
  const metadata = {
    schemaVersion: 1,
    sourceRepository,
    sourceCommit: commit,
    version: manifest.version,
    environment,
    target: "win32-x64",
    node: process.version,
    ...identity,
    size: contents.length,
    sha256: sha256(contents),
  };
  assert.ok(metadata.size > 0, "The binary executable is empty");
  await mkdir(output, { recursive: true });
  await copyFile(executable, path.join(output, identity.binary));
  await writeFile(path.join(output, "SHA256SUMS"), `${metadata.sha256}  ${identity.binary}\n`);
  await writeFile(path.join(output, "release.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  await writeFile(path.join(output, "release-notes.md"), releaseNotes(metadata));
  return verifyRelease(output, environment, commit);
}

export async function verifyRelease(output, environment, commit) {
  const metadata = JSON.parse(await readFile(path.join(output, "release.json"), "utf8"));
  const identity = releaseIdentity(metadata.version, environment, commit);
  assert.equal(metadata.schemaVersion, 1, "Unsupported release metadata");
  assert.equal(metadata.sourceRepository, sourceRepository, "Unexpected source repository");
  assert.equal(metadata.sourceCommit, commit, "Unexpected source commit");
  assert.equal(metadata.environment, environment, "Unexpected service profile");
  assert.equal(metadata.target, "win32-x64", "Unexpected target platform");
  assert.equal(metadata.tag, identity.tag, "Unexpected release tag");
  assert.equal(metadata.binary, identity.binary, "Unexpected executable filename");
  assert.match(metadata.node, /^v24\.\d+\.\d+$/, "Unexpected Node.js runtime");
  assert.deepEqual(
    (await readdir(output)).sort(),
    [identity.binary, "SHA256SUMS", "release.json", "release-notes.md"].sort(),
    "Unexpected release asset set",
  );
  const contents = await readFile(path.join(output, identity.binary));
  assert.ok(contents.length > 0, "The binary executable is empty");
  assert.equal(contents.length, metadata.size, "Executable size does not match metadata");
  assert.equal(sha256(contents), metadata.sha256, "Executable SHA-256 does not match metadata");
  assert.equal(
    await readFile(path.join(output, "SHA256SUMS"), "utf8"),
    `${metadata.sha256}  ${identity.binary}\n`,
    "Checksum file does not match metadata",
  );
  assert.equal(await readFile(path.join(output, "release-notes.md"), "utf8"), releaseNotes(metadata));
  return identity;
}

async function main() {
  const [command, first, second, ...extra] = process.argv.slice(2);
  const environment = process.env.RELEASE_ENVIRONMENT;
  const commit = process.env.SOURCE_COMMIT;
  let result;
  if (command === "stage" && first && second && extra.length === 0) {
    result = await stageRelease(first, second, environment, commit);
  } else if (command === "verify" && first && !second) {
    result = await verifyRelease(first, environment, commit);
  } else {
    throw new Error("Usage: foundryx_release.mjs stage <cli-root> <output> | verify <output>");
  }
  console.log(`Verified ${result.binary} for ${result.tag}`);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `tag=${result.tag}\nbinary=${result.binary}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
