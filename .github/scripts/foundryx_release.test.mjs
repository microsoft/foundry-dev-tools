import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { releaseIdentity, releaseTargets, stageRelease, verifyRelease, assembleRelease, verifyBundle } from "./foundryx_release.mjs";

const commit = "a".repeat(40);

async function fixture(t, target = `${process.platform}-${process.arch}`) {
  const root = await mkdtemp(path.join(os.tmpdir(), "foundryx-release-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cli = path.join(root, "cli");
  const output = path.join(root, "assets");
  const binaryDirectory = path.join(cli, "release", "binary", target);
  await mkdir(binaryDirectory, { recursive: true });
  await mkdir(path.join(cli, "dist"), { recursive: true });
  await writeFile(path.join(cli, "dist", "build-info.json"), JSON.stringify({ version: "0.6.6-dev", environment: "dev" }));
  await writeFile(path.join(cli, "package.json"), JSON.stringify({ version: "0.6.6" }));
  await writeFile(path.join(cli, "package-lock.json"), JSON.stringify({
    version: "0.6.6", packages: { "": { version: "0.6.6" } },
  }));
  await writeFile(path.join(binaryDirectory, target.startsWith("win32-") ? "foundryx.exe" : "foundryx"), "synthetic executable fixture");
  return { cli, output };
}

test("release identities separate service profiles and reject unsafe inputs", () => {
  assert.equal(releaseIdentity("0.6.6-dev", "dev", commit).tag, "foundryx-v0.6.6-dev");
  assert.equal(releaseIdentity("0.6.6-dev", "dev", commit).title, "[Preview] FoundryX CLI v0.6.6-dev");
  assert.notEqual(
    releaseIdentity("0.6.6-dev", "dev", commit).binary,
    releaseIdentity("0.6.6-test", "test", commit).binary,
  );
  for (const version of ["../bad", "0.6.6\ninjected=value", "main"]) {
    assert.throws(() => releaseIdentity(version, "dev", commit));
  }
  for (const profile of ["staging", "production", "team-2", "Dev", "team.profile"]) {
    assert.equal(releaseIdentity(`0.6.6-${profile}`, profile, commit).tag, `foundryx-v0.6.6-${profile}`);
  }
  assert.throws(() => releaseIdentity("0.6.6", "dev", "main"));
});

test("stages exactly the binary, checksum, provenance and usage notes", async (t) => {
  const { cli, output } = await fixture(t);
  const identity = await stageRelease(cli, output, "dev", commit);
  assert.deepEqual(await verifyRelease(output, "dev", commit), identity);
  const metadata = JSON.parse(await readFile(path.join(output, "release.json"), "utf8"));
  assert.equal(metadata.sourceCommit, commit);
  assert.equal(metadata.sourceRepository, "SmallBlackHole/foundry-orchestrator-agent");
  assert.equal(metadata.target, `${process.platform}-${process.arch}`);
  assert.match(metadata.sha256, /^[0-9a-f]{64}$/);
  const notes = await readFile(path.join(output, "release-notes.md"), "utf8");
  assert.match(notes, /foundryx auth login/);
  assert.match(notes, /no separate Node\.js installation is needed/);
});

test("rejects CLI and lockfile version mismatches", async (t) => {
  const { cli, output } = await fixture(t);
  await writeFile(path.join(cli, "package.json"), JSON.stringify({ version: "0.6.7" }));
  await assert.rejects(stageRelease(cli, output, "dev", commit), /versions differ/);
});

test("rejects a different source commit or service profile", async (t) => {
  const { cli, output } = await fixture(t);
  await stageRelease(cli, output, "dev", commit);
  await assert.rejects(verifyRelease(output, "dev", "b".repeat(40)), /source commit/);
  await assert.rejects(verifyRelease(output, "test", commit), /environment|service profile/);
});

test("stages every platform with its own filename and combines one complete release", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "foundryx-matrix-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = path.join(root, "builds");
  const output = path.join(root, "release");
  for (const target of releaseTargets) {
    const { cli } = await fixture(t, target);
    const identity = await stageRelease(cli, path.join(input, target), "dev", commit, target);
    assert.equal(identity.binary.endsWith(".exe"), target.startsWith("win32-"));
  }
  const identity = await assembleRelease(input, output, "dev", commit);
  assert.equal(identity.title, "[Preview] FoundryX CLI v0.6.6-dev");
  assert.deepEqual(await verifyBundle(output, "dev", commit), identity);
  const metadata = JSON.parse(await readFile(path.join(output, "release.json"), "utf8"));
  assert.deepEqual(metadata.builds.map(b => b.target), releaseTargets);
  const first = metadata.builds[0];
  await writeFile(path.join(output, first.binary), "altered");
  await assert.rejects(verifyBundle(output, "dev", commit), /size|SHA-256/);
});

test("refuses to assemble an incomplete platform matrix", async (t) => {
  const { cli, output } = await fixture(t, "win32-x64");
  const input = path.join(output, "builds");
  await stageRelease(cli, path.join(input, "win32-x64"), "dev", commit, "win32-x64");
  await assert.rejects(assembleRelease(input, path.join(output, "bundle"), "dev", commit), /platform builds/);
});

test("rejects an environment mismatch between generated version and profile", async (t) => {
  const { cli, output } = await fixture(t);
  await writeFile(path.join(cli, "dist", "build-info.json"), JSON.stringify({ version: "0.6.6-test", environment: "test" }));
  await assert.rejects(stageRelease(cli, output, "dev", commit), /environment/);
  assert.throws(() => releaseIdentity("0.6.6+dev", "dev", commit));
  assert.throws(() => releaseIdentity("0.6.6", "dev", commit));
});

test("rejects changed executable bytes even when size is unchanged", async (t) => {
  const { cli, output } = await fixture(t);
  const { binary } = await stageRelease(cli, output, "dev", commit);
  const contents = await readFile(path.join(output, binary));
  contents[0] ^= 1;
  await writeFile(path.join(output, binary), contents);
  await assert.rejects(verifyRelease(output, "dev", commit), /SHA-256/);
});

test("rejects changed checksum files and unexpected extra assets", async (t) => {
  const { cli, output } = await fixture(t);
  await stageRelease(cli, output, "dev", commit);
  const checksum = path.join(output, "SHA256SUMS");
  const original = await readFile(checksum);
  await writeFile(checksum, "invalid checksum\n");
  await assert.rejects(verifyRelease(output, "dev", commit), /Checksum file/);
  await writeFile(checksum, original);
  await writeFile(path.join(output, "unreviewed.exe"), "extra");
  await assert.rejects(verifyRelease(output, "dev", commit), /asset set/);
});

test("rejects executable filename substitution in release metadata", async (t) => {
  const { cli, output } = await fixture(t);
  await stageRelease(cli, output, "dev", commit);
  const filename = path.join(output, "release.json");
  const metadata = JSON.parse(await readFile(filename, "utf8"));
  metadata.binary = "../outside.exe";
  await writeFile(filename, JSON.stringify(metadata));
  await assert.rejects(verifyRelease(output, "dev", commit), /executable filename/);
});
