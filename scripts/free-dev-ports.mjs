/**
 * Frees common HackCore / Vite ports so `pnpm dev` can bind cleanly.
 * Windows: netstat + taskkill. Unix: lsof + kill.
 */
import { execSync } from "node:child_process";

const PORTS = [3000, 5173, 5174, 5175, 5176, 5177, 5178];

function pidsOnWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!/\bLISTENING\b/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function pidsOnUnix(port) {
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: "utf8" });
    return out
      .split(/\s+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

const isWin = process.platform === "win32";
const all = new Set();

for (const port of PORTS) {
  const pids = isWin ? pidsOnWindows(port) : pidsOnUnix(port);
  for (const pid of pids) all.add(pid);
}

if (all.size === 0) {
  console.log(`[free-dev-ports] nothing listening on ${PORTS.join(", ")}`);
  process.exit(0);
}

for (const pid of all) {
  try {
    if (isWin) execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    else execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    console.log(`[free-dev-ports] killed pid ${pid}`);
  } catch {
    console.log(`[free-dev-ports] could not kill pid ${pid}`);
  }
}
