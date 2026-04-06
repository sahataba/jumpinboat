import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL_MIGRATE ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_MIGRATE, POSTGRES_URL_NON_POOLING, DATABASE_URL, or POSTGRES_URL is required to generate migrations",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
