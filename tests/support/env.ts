import { config } from "dotenv";

config({ quiet: true });
const testUrl = process.env.TEST_DATABASE_URL ?? "postgresql://court:court@localhost:5432/court_test?schema=public";
process.env.DATABASE_URL = testUrl;
process.env.SCRYPT_N = "1024"; // fast hashing in tests
process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-123";
process.env.DISABLE_RATE_LIMITS = "0";
