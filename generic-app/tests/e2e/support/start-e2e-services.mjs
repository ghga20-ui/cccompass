import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createServer } from "pglite-server";

process.env.E2E_JSON_DB_PATH ??= "evidence/task-11-e2e-db.json";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55432/generic_curriculum_test?schema=public";

process.env.DATABASE_URL = databaseUrl;
process.env.CURRICULUM_PARSER_PROVIDER = "mock";
process.env.CURRICULUM_STRUCTURER_PROVIDER = "mock";
const e2ePort = process.env.E2E_PORT ?? "3100";
writeFileSync(process.env.E2E_JSON_DB_PATH, JSON.stringify({ drafts: [], publications: [] }));

let pgServer;

if (!process.env.E2E_JSON_DB_PATH) {
  const db = new PGlite();
  await db.waitReady;

  pgServer = createServer(db);
  pgServer.listen(55432, "127.0.0.1");
  await once(pgServer, "listening");
}

function spawnPortable(command, args) {
  if (process.platform !== "win32") {
    return spawn(command, args, {
      env: process.env,
      stdio: "inherit",
    });
  }

  return spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
    env: process.env,
    stdio: "inherit",
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnPortable(command, args);

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

if (!process.env.E2E_JSON_DB_PATH) {
  await run("npx", ["prisma", "db", "push", "--skip-generate"]);
}

const next = spawnPortable("npx", [
  "next",
  "dev",
  "--hostname",
  "127.0.0.1",
  "--port",
  e2ePort,
]);

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!next.killed) {
    next.kill();
  }

  if (pgServer) {
    await new Promise((resolve) => pgServer.close(resolve));
  }
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

next.on("error", async (error) => {
  console.error(error);
  await shutdown();
  process.exit(1);
});

next.on("exit", async (code) => {
  await shutdown();
  process.exit(code ?? 0);
});
