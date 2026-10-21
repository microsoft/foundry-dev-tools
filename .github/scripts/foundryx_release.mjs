import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourceRepository = "SmallBlackHole/foundry-orchestrator-agent";
export const releaseTargets = ["win32-x64", "win32-arm64", "darwin-x64", "darwin-arm64", "linux-x64"];

export function releaseIdentity(version, environment, commit, target = `${process.platform}-${process.arch}`) {
  assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "Invalid CLI version");
  assert.match(commit, /^[0-9a-f]{40}$/, "Expected a lowercase full source commit SHA");
  assert.ok(releaseTargets.includes(target), "Unsupported target platform");
  assert.ok(version.endsWith(`-${environment}`), "Build version must include the selected environment");
  return {
    tag: `foundryx-v${version}`,
    title: `[Preview] FoundryX CLI v${version}`,
    binary: `foundryx-${version}-${target}${target.startsWith("win32-") ? ".exe" : ""}`,
  };
}

function releaseNotes(metadata) {
  return [
    "# FoundryX CLI",
    "",
    `- CLI version: ${metadata.version}`,
    `- Service profile: ${metadata.environment}`,
    `- Platforms: ${metadata.builds ? "Windows x64/ARM64, macOS x64/ARM64, Linux x64" : metadata.target}`,
    `- Source: ${sourceRepository}@${metadata.sourceCommit}`,
    `- Build runtime: ${metadata.node ?? "Node.js 24"}`,
    "",
    "Node.js and CLI dependencies are included; no separate Node.js installation is needed.",
    "",
    "Download the binary for your platform and rename it to foundryx.exe (Windows) or foundryx (macOS/Linux).",
    "On macOS/Linux, run `chmod +x foundryx`. Add its directory to PATH.",
    "Run `foundryx --version` to verify installation, then `foundryx auth login` to sign in.",
    "SHA256SUMS contains the binaries' SHA-256 checksums.",
    "Linux sign-in requires libsecret-1 and a running Secret Service/keyring.",
    "",
  ].join("\n");
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function stageRelease(cliRoot, output, environment, commit, target = `${process.platform}-${process.arch}`) {
  const manifest = JSON.parse(await readFile(path.join(cliRoot, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(path.join(cliRoot, "package-lock.json"), "utf8"));
  const buildInfo = JSON.parse(await readFile(path.join(cliRoot, "dist", "build-info.json"), "utf8"));
  const identity = releaseIdentity(buildInfo.version, environment, commit, target);
  assert.equal(lock.version, manifest.version, "CLI and lockfile versions differ");
  assert.equal(lock.packages[""].version, manifest.version, "Lockfile root version differs");
  assert.equal(buildInfo.version, `${manifest.version}-${environment}`, "Build version does not match package and environment");
  assert.equal(buildInfo.environment, environment, "Build service profile does not match selected environment");
  assert.match(process.version, /^v24\./, "Stage the release using Node.js 24");
  const executable = path.join(cliRoot, "release", "binary", target, target.startsWith("win32-") ? "foundryx.exe" : "foundryx");
  const contents = await readFile(executable);
  const metadata = {
    schemaVersion: 1,
    sourceRepository,
    sourceCommit: commit,
    version: buildInfo.version,
    environment,
    target,
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
  return verifyRelease(output, environment, commit, target);
}

export async function verifyRelease(output, environment, commit, target = `${process.platform}-${process.arch}`) {
  const metadata = JSON.parse(await readFile(path.join(output, "release.json"), "utf8"));
  const identity = await verifyBinary(output, metadata, environment, commit, target);
  assert.deepEqual(
    (await readdir(output)).sort(),
    [identity.binary, "SHA256SUMS", "release.json", "release-notes.md"].sort(),
    "Unexpected release asset set",
  );
  assert.equal(
    await readFile(path.join(output, "SHA256SUMS"), "utf8"),
    `${metadata.sha256}  ${identity.binary}\n`,
    "Checksum file does not match metadata",
  );
  assert.equal(await readFile(path.join(output, "release-notes.md"), "utf8"), releaseNotes(metadata));
  return identity;
}

async function verifyBinary(output, metadata, environment, commit, target) {
  const identity = releaseIdentity(metadata.version, environment, commit, target);
  assert.equal(metadata.schemaVersion, 1, "Unsupported release metadata");
  assert.equal(metadata.sourceRepository, sourceRepository, "Unexpected source repository");
  assert.equal(metadata.sourceCommit, commit, "Unexpected source commit");
  assert.equal(metadata.environment, environment, "Unexpected service profile");
  assert.equal(metadata.target, target, "Unexpected target platform");
  assert.equal(metadata.tag, identity.tag, "Unexpected release tag");
  assert.equal(metadata.title, identity.title, "Unexpected release title");
  assert.equal(metadata.binary, identity.binary, "Unexpected executable filename");
  assert.match(metadata.node, /^v24\.\d+\.\d+$/, "Unexpected Node.js runtime");
  const contents = await readFile(path.join(output, identity.binary));
  assert.ok(contents.length > 0, "The binary executable is empty");
  assert.equal(contents.length, metadata.size, "Executable size does not match metadata");
  assert.equal(sha256(contents), metadata.sha256, "Executable SHA-256 does not match metadata");
  return identity;
}

export async function assembleRelease(input, output, environment, commit) {
  assert.deepEqual((await readdir(input)).sort(), [...releaseTargets].sort(), "Missing or unexpected platform builds");
  const builds = [];
  for (const target of releaseTargets) {
    const directory = path.join(input, target);
    await verifyRelease(directory, environment, commit, target);
    builds.push(JSON.parse(await readFile(path.join(directory, "release.json"), "utf8")));
  }
  const first = builds[0];
  for (const build of builds) assert.equal(build.version, first.version, "Platform versions differ");
  await mkdir(output, { recursive: true });
  for (const build of builds) {
    await copyFile(path.join(input, build.target, build.binary), path.join(output, build.binary));
  }
  const metadata = {
    schemaVersion: 2, sourceRepository, sourceCommit: commit, version: first.version,
    environment, tag: first.tag, title: first.title, builds,
  };
  await writeFile(path.join(output, "release.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  await writeFile(path.join(output, "SHA256SUMS"), builds.map(b => `${b.sha256}  ${b.binary}\n`).join(""));
  await writeFile(path.join(output, "release-notes.md"), releaseNotes(metadata));
  return verifyBundle(output, environment, commit);
}

export async function verifyBundle(output, environment, commit) {
  const metadata = JSON.parse(await readFile(path.join(output, "release.json"), "utf8"));
  assert.equal(metadata.schemaVersion, 2, "Unsupported bundle metadata");
  const identity = releaseIdentity(metadata.version, environment, commit, releaseTargets[0]);
  assert.equal(metadata.sourceRepository, sourceRepository, "Unexpected source repository");
  assert.equal(metadata.sourceCommit, commit, "Unexpected source commit");
  assert.equal(metadata.environment, environment, "Unexpected service profile");
  assert.equal(metadata.tag, identity.tag, "Unexpected release tag");
  assert.equal(metadata.title, identity.title, "Unexpected release title");
  assert.deepEqual(metadata.builds.map(b => b.target), releaseTargets, "Missing, duplicate or unexpected platform builds");
  for (const build of metadata.builds) {
    assert.equal(build.version, metadata.version, "Platform versions differ");
    await verifyBinary(output, build, environment, commit, build.target);
  }
  assert.deepEqual(
    (await readdir(output)).sort(),
    [...metadata.builds.map(b => b.binary), "SHA256SUMS", "release.json", "release-notes.md"].sort(),
    "Unexpected release asset set",
  );
  assert.equal(
    await readFile(path.join(output, "SHA256SUMS"), "utf8"),
    metadata.builds.map(b => `${b.sha256}  ${b.binary}\n`).join(""),
    "Checksum file does not match metadata",
  );
  assert.equal(await readFile(path.join(output, "release-notes.md"), "utf8"), releaseNotes(metadata));
  return { tag: identity.tag, title: identity.title };
}

async function main() {
  const [command, first, second, ...extra] = process.argv.slice(2);
  const environment = process.env.RELEASE_ENVIRONMENT;
  const commit = process.env.SOURCE_COMMIT;
  let result;
  if (command === "stage" && first && second && extra.length === 0) {
    result = await stageRelease(first, second, environment, commit);
  } else if (command === "assemble" && first && second && extra.length === 0) {
    result = await assembleRelease(first, second, environment, commit);
  } else if (command === "verify" && first && !second) {
    result = await verifyBundle(first, environment, commit);
  } else {
    throw new Error("Usage: foundryx_release.mjs stage <cli-root> <output> | assemble <builds> <output> | verify <output>");
  }
  console.log(`Verified ${result.tag}${result.binary ? `: ${result.binary}` : ""}`);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `tag=${result.tag}\ntitle=${result.title}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
