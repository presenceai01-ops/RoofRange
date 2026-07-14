import app from "./src/server/index";
import { sleep } from "bun";

const PORT = 3000;
const HOST = "0.0.0.0";

const freePort =
  `for _ in $(seq 1 25); do ` +
  `pids=$(lsof -t -iTCP:${String(PORT)} -sTCP:LISTEN 2>/dev/null || true); ` +
  `if [ -z "$pids" ]; then exit 0; fi; ` +
  `kill $pids 2>/dev/null || true; sleep 0.2; ` +
  `done`;

for (let attempt = 1; ; attempt++) {
  await Bun.$`sudo sh -c ${freePort}`.quiet().nothrow();
  try {
    Bun.serve({
      port: PORT,
      hostname: HOST,
      fetch: app.fetch,
    });
    break;
  } catch (err) {
    if (attempt >= 10) throw err;
    await sleep(200);
  }
}

console.log(`RoofRange serving on http://${HOST}:${String(PORT)}`);
