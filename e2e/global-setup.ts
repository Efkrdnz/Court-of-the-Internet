import { execSync } from "node:child_process";
import { config } from "dotenv";

/** Resets and seeds the dedicated e2e database before the suite runs. */
export default function globalSetup() {
  config({ quiet: true });
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://court:court@localhost:5432/court_e2e?schema=public";
  if (!/_e2e\b/.test(url)) throw new Error(`Refusing to reset a non-e2e database: ${url}`);
  // Seed with the real quorum so the data matches dev (incl. a dismissed case); the e2e server runs with quorum 3.
  const env = { ...process.env, DATABASE_URL: url, COURT_QUORUM: "10" };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx --conditions=react-server prisma/seed.ts --reset", { env, stdio: "pipe" });
}
