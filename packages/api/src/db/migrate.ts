import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

import * as schema from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL_MIGRATE ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL (or DATABASE_URL_MIGRATE) is required");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    await migrate(db, {
      migrationsFolder: resolve(__dirname, "../../drizzle"),
    });
  } finally {
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error("Failed to run migrations", error);
  process.exit(1);
});
