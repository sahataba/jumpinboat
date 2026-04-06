import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Route Handlers import `@jumpinboat/api`, which reads `DATABASE_URL` (and auth secrets) from
 * `process.env`. Next only loads `.env*` from `packages/web` by default; local DB config often
 * lives in `packages/api/.env` only — merge it in without clobbering vars already set for this process.
 */
function mergeSiblingApiEnv() {
  const envPath = path.join(__dirname, "..", "api", ".env");
  let raw;
  try {
    raw = fs.readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

mergeSiblingApiEnv();

/** @type {import("next").NextConfig} */
// HTTP API is implemented as App Router Route Handlers; `@jumpinboat/api` provides services + DB.
const nextConfig = {
  // Vercel deploys this app from `packages/web`, but the traced server runtime also needs
  // sibling workspace outputs that live under `packages/api` and `packages/shared`.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/api/*": ["../api/dist/**/*", "../shared/dist/**/*"],
    "/*": ["../shared/dist/**/*"],
  },
  serverExternalPackages: ["argon2", "pg", "@neondatabase/serverless", "@jumpinboat/api"],
};

export default nextConfig;
