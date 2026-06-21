const http = require("http");

function probe({ host, port, path: urlPath, timeoutMs = 2500 }) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: urlPath, timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function getHealth() {
  const [qvac, api, web] = await Promise.all([
    probe({ host: "127.0.0.1", port: 8765, path: "/health" }),
    probe({ host: "127.0.0.1", port: 8000, path: "/health" }),
    probe({ host: "127.0.0.1", port: 3000, path: "/" }),
  ]);
  return {
    qvac,
    api,
    web,
    ready: qvac && api && web,
  };
}

async function waitForReady(maxWaitMs = 120000, intervalMs = 1500) {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const health = await getHealth();
    if (health.ready) return health;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return getHealth();
}

module.exports = { getHealth, waitForReady, probe };
