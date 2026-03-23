import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

let databasePool: Pool | null = null;

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
};

const getPool = () => {
  if (!databasePool) {
    databasePool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return databasePool;
};

export const pool = getPool();

export const db = drizzle(pool, {
  schema,
});
