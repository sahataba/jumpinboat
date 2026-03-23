import { migrate } from "drizzle-orm/node-postgres/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { db, pool } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  await migrate(db, {
    migrationsFolder: resolve(__dirname, "../../drizzle"),
  });

  await pool.end();
}

main().catch(async (error) => {
  console.error("Failed to run migrations", error);
  await pool.end();
  process.exit(1);
});
