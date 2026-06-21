#!/usr/bin/env node
/**
 * Download and configure Windows embeddable Python for the desktop installer.
 * Output: desktop/python-runtime/ (gitignored; bundled via electron-builder)
 */
import { createWriteStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import https from "node:https";
import { pipeline } from "node:stream/promises";

const PYTHON_VERSION = "3.12.9";
const TAG = `python-${PYTHON_VERSION}-embed-amd64`;
const ZIP_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/${TAG}.zip`;
const GET_PIP_URL = "https://bootstrap.pypa.io/get-pip.py";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeDir = join(root, "desktop", "python-runtime");
const isWin = process.platform === "win32";

function run(exe, args, cwd) {
  const r = spawnSync(exe, args, { cwd, stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      https
        .get(u, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            follow(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${u}`));
            return;
          }
          pipeline(res, createWriteStream(dest)).then(resolve).catch(reject);
        })
        .on("error", reject);
    };
    follow(url);
  });
}

async function main() {
  if (!isWin) {
    console.log("Embedded Python fetch is Windows-only; skipping.");
    return;
  }

  const pythonExe = join(runtimeDir, "python.exe");
  if (existsSync(pythonExe)) {
    console.log(`✓ Embedded Python already present: ${runtimeDir}`);
    return;
  }

  mkdirSync(runtimeDir, { recursive: true });
  const zipPath = join(runtimeDir, `${TAG}.zip`);

  console.log(`Downloading ${ZIP_URL}…`);
  await download(ZIP_URL, zipPath);

  console.log("Extracting…");
  const ps = `$ErrorActionPreference='Stop'; Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${runtimeDir.replace(/'/g, "''")}' -Force`;
  run("powershell", ["-NoProfile", "-Command", ps], root);
  unlinkSync(zipPath);

  writeFileSync(
    join(runtimeDir, "python312._pth"),
    "python312.zip\r\n.\r\nLib\\site-packages\r\n\r\nimport site\r\n",
  );
  mkdirSync(join(runtimeDir, "Lib", "site-packages"), { recursive: true });

  const getPip = join(runtimeDir, "get-pip.py");
  console.log("Installing pip…");
  await download(GET_PIP_URL, getPip);
  run(pythonExe, [getPip, "--no-warn-script-location"], runtimeDir);
  unlinkSync(getPip);

  console.log("Installing virtualenv…");
  run(pythonExe, ["-m", "pip", "install", "virtualenv", "--no-warn-script-location"], runtimeDir);

  console.log(`\n✓ Embedded Python ${PYTHON_VERSION} ready at ${runtimeDir}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
