import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

import * as schema from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const toErrorDetails = (error: unknown) => {
  if (!(error instanceof Error)) {
    return { error };
  }

  const wrappedError = error as Error & {
    query?: string;
    params?: unknown[];
    cause?: unknown;
  };

  const cause =
    wrappedError.cause instanceof Error
      ? {
          name: wrappedError.cause.name,
          message: wrappedError.cause.message,
          stack: wrappedError.cause.stack,
          ...((wrappedError.cause as unknown) as Record<string, unknown>),
        }
      : wrappedError.cause;

  return {
    name: wrappedError.name,
    message: wrappedError.message,
    stack: wrappedError.stack,
    ...(wrappedError.query ? { query: wrappedError.query } : {}),
    ...(wrappedError.params ? { params: wrappedError.params } : {}),
    ...(cause ? { cause } : {}),
  };
};

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
      migrationsSchema: "public",
    });
  } finally {
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error("Failed to run migrations", toErrorDetails(error));
  process.exit(1);
});
