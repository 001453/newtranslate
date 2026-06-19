#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "backend");
const isWin = process.platform === "win32";
const venvUvicorn = join(backend, ".venv", isWin ? "Scripts/uvicorn.exe" : "bin/uvicorn");
const venvPy = join(backend, ".venv", isWin ? "Scripts/python.exe" : "bin/python");

const cmd = existsSync(venvUvicorn) ? venvUvicorn : isWin ? "uvicorn" : "uvicorn";
const args = existsSync(venvUvicorn)
  ? ["main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
  : ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"];
const executable = existsSync(venvUvicorn) ? cmd : existsSync(venvPy) ? venvPy : "python";

const child = spawn(executable, existsSync(venvUvicorn) ? args : args, {
  cwd: backend,
  stdio: "inherit",
  shell: isWin,
  env: { ...process.env },
});

child.on("exit", (code) => process.exit(code ?? 0));
