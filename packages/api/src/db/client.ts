import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Pool } from "pg";

import * as schema from "./schema.js";

export type AppDatabase = NeonHttpDatabase<typeof schema> | NodePgDatabase<typeof schema>;

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for server database access");
  }

  return databaseUrl;
};

/** Neon-hosted connection strings use HTTP driver on Vercel; others use node-postgres with a small pool. */
const isNeonHostedUrl = (url: string) =>
  url.includes("neon.tech") || url.includes("neon.build") || process.env.DATABASE_USE_NEON_HTTP === "1";

let cached: AppDatabase | undefined;
let pool: Pool | null = null;

/** Lazy init so `next build` can import API code without DATABASE_URL at module load time. */
export function getDb(): AppDatabase {
  if (cached) {
    return cached;
  }

  const url = getDatabaseUrl();
  const useNeonHttp = isNeonHostedUrl(url);

  if (useNeonHttp) {
    cached = drizzleNeonHttp(neon(url), { schema });
    return cached;
  }

  pool = new Pool({
    connectionString: url,
    max: process.env.VERCEL === "1" ? 1 : 10,
  });
  cached = drizzlePg(pool, { schema });
  return cached;
}
