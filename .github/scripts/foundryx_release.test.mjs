import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { releaseIdentity, stageRelease, verifyRelease } from "./foundryx_release.mjs";

const commit = "a".repeat(40);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "foundryx-release-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cli = path.join(root, "cli");
  const output = path.join(root, "assets");
  const binaryDirectory = path.join(cli, "release", "binary", "win32-x64");
  await mkdir(binaryDirectory, { recursive: true });
  await writeFile(path.join(cli, "package.json"), JSON.stringify({ version: "0.6.6-dev" }));
  await writeFile(path.join(cli, "package-lock.json"), JSON.stringify({
    version: "0.6.6-dev", packages: { "": { version: "0.6.6-dev" } },
  }));
  await writeFile(path.join(binaryDirectory, "foundry.exe"), "synthetic executable fixture");
  return { cli, output };
}

test("release identities separate service profiles and reject unsafe inputs", () => {
  assert.equal(releaseIdentity("0.6.6-dev", "dev", commit).tag, "foundryx-v0.6.6-dev-dev");
  assert.notEqual(
    releaseIdentity("0.6.6", "dev", commit).binary,
    releaseIdentity("0.6.6", "test", commit).binary,
  );
  for (const version of ["../bad", "0.6.6\ninjected=value", "main"]) {
    assert.throws(() => releaseIdentity(version, "dev", commit));
  }
  assert.throws(() => releaseIdentity("0.6.6", "production", commit));
  assert.throws(() => releaseIdentity("0.6.6", "dev", "main"));
});

test("stages exactly the binary, checksum, provenance and draft notes", async (t) => {
  const { cli, output } = await fixture(t);
  const identity = await stageRelease(cli, output, "dev", commit);
  assert.deepEqual(await verifyRelease(output, "dev", commit), identity);
  const metadata = JSON.parse(await readFile(path.join(output, "release.json"), "utf8"));
  assert.equal(metadata.sourceCommit, commit);
  assert.equal(metadata.sourceRepository, "SmallBlackHole/foundry-orchestrator-agent");
  assert.equal(metadata.target, "win32-x64");
  assert.match(metadata.sha256, /^[0-9a-f]{64}$/);
  const notes = await readFile(path.join(output, "release-notes.md"), "utf8");
  assert.match(notes, /This executable is unsigned\./);
  assert.doesNotMatch(notes, /experimental/i);
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
  await assert.rejects(verifyRelease(output, "test", commit), /service profile/);
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
