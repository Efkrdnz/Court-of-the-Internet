import { execSync } from "node:child_process";
import { config } from "dotenv";

export default function setup() {
  config({ quiet: true });
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://court:court@localhost:5432/court_test?schema=public";
  if (!/_test\b/.test(url)) throw new Error(`Refusing to run tests against a non-test database: ${url}`);
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
