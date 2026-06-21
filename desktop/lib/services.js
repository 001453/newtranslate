const { spawn, execSync } = require("child_process");
const path = require("path");
const { existsSync } = require("fs");
const { getAppRoot, getNodeSpawnOptions, getBackendVenvPython } = require("./paths");

const isWin = process.platform === "win32";
const children = [];
let starting = false;
let stopping = false;

function prefixLog(name, data, logFn) {
  if (!logFn) return;
  for (const line of String(data).split(/\r?\n/)) {
    if (line.trim()) logFn(`[${name}] ${line}`);
  }
}

function spawnService(name, options, logFn) {
  const child = spawn(options.cmd, options.args, {
    cwd: options.cwd,
    env: options.env,
    shell: options.shell ?? false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout?.on("data", (d) => prefixLog(name, d, logFn));
  child.stderr?.on("data", (d) => prefixLog(name, d, logFn));
  child.on("exit", (code) => {
    const idx = children.indexOf(child);
    if (idx >= 0) children.splice(idx, 1);
    if (!stopping && code !== 0 && logFn) {
      logFn(`[${name}] exited with code ${code}`);
    }
  });

  children.push(child);
  return child;
}

function pidsOnPort(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, {
        encoding: "utf8",
        shell: true,
        stdio: ["pipe", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const m = line.trim().match(/\s(\d+)\s*$/);
        if (m) pids.add(Number(m[1]));
      }
      return [...pids];
    }
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return out
      .split(/\r?\n/)
      .map((s) => Number(s.trim()))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function killPort(port) {
  for (const pid of pidsOnPort(port)) {
    if (!pid || pid === 4) continue;
    try {
      if (isWin) execSync(`taskkill /pid ${pid} /f /t`, { shell: true, stdio: "ignore" });
      else execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    } catch {
      /* ignore */
    }
  }
}

async function startAll(logFn) {
  if (starting) return { ok: false, error: "Already starting" };
  starting = true;

  try {
    const root = getAppRoot();
    const { node, env } = getNodeSpawnOptions();
    const venvPy = getBackendVenvPython();
    const backendDir = path.join(root, "backend");
    const venvUvicorn = path.join(
      backendDir,
      ".venv",
      isWin ? "Scripts/uvicorn.exe" : "bin/uvicorn",
    );

    if (!existsSync(venvPy)) {
      return { ok: false, error: "Setup incomplete — run First-time setup from the tray menu." };
    }

    spawnService(
      "QVAC",
      {
        cmd: node,
        args: [path.join(root, "qvac-service", "server.js")],
        cwd: path.join(root, "qvac-service"),
        env,
        shell: false,
      },
      logFn,
    );

    const apiCmd = existsSync(venvUvicorn) ? venvUvicorn : venvPy;
    const apiArgs = existsSync(venvUvicorn)
      ? ["main:app", "--host", "127.0.0.1", "--port", "8000"]
      : ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"];

    spawnService(
      "API",
      {
        cmd: apiCmd,
        args: apiArgs,
        cwd: backendDir,
        env: { ...process.env },
        shell: isWin && !existsSync(venvUvicorn),
      },
      logFn,
    );

    const frontendDir = path.join(root, "frontend");
    const useProd = existsSync(path.join(frontendDir, ".next"));
    if (useProd) {
      spawnService(
        "WEB",
        {
          cmd: isWin ? "npm.cmd" : "npm",
          args: ["run", "start"],
          cwd: frontendDir,
          env: { ...process.env, PORT: "3000" },
          shell: isWin,
        },
        logFn,
      );
    } else {
      spawnService(
        "WEB",
        {
          cmd: isWin ? "npm.cmd" : "npm",
          args: ["run", "dev"],
          cwd: frontendDir,
          env: { ...process.env },
          shell: isWin,
        },
        logFn,
      );
    }

    return { ok: true };
  } finally {
    starting = false;
  }
}

function stopAll() {
  stopping = true;
  for (const child of [...children]) {
    if (!child.killed) {
      if (isWin) spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { shell: true });
      else child.kill("SIGTERM");
    }
  }
  children.length = 0;
  for (const port of [8765, 8000, 3000]) killPort(port);
  stopping = false;
}

function isRunning() {
  return children.length > 0;
}

module.exports = { startAll, stopAll, isRunning, pidsOnPort };
