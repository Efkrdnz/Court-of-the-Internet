import "server-only";

function intEnv(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

const isProduction = process.env.NODE_ENV === "production";

/** Read at call time so tests can tweak process.env between cases. */
export const gameConfig = {
  get quorum() {
    return intEnv("COURT_QUORUM", 10, 1);
  },
  get deliberationMs() {
    // COURT_DELIBERATION_MINUTES wins if set (handy for demos/e2e); otherwise hours.
    const minutes = process.env.COURT_DELIBERATION_MINUTES;
    if (minutes) return intEnv("COURT_DELIBERATION_MINUTES", 24 * 60, 1) * 60_000;
    return intEnv("COURT_DELIBERATION_HOURS", 24, 1) * 3_600_000;
  },
  get extensionMs() {
    return this.deliberationMs;
  },
  get maxExtensions() {
    return intEnv("COURT_MAX_EXTENSIONS", 1, 0);
  },
  get claimMs() {
    return intEnv("COURT_CLAIM_MINUTES", 30, 1) * 60_000;
  },
  /** Submissions that started before expiry are accepted this long after it. */
  claimGraceMs: 2 * 60_000,
  maxConfessionsPerDay: 5,
  autoReviewReportThreshold: 3,
};

export const appConfig = {
  isProduction,
  get siteUrl() {
    // SITE_URL is read at runtime. NEXT_PUBLIC_SITE_URL is only a fallback, because Next
    // inlines NEXT_PUBLIC_* values at build time, so changing it would need a rebuild.
    const env = process.env;
    return (env["SITE_URL"] || env["NEXT_PUBLIC_SITE_URL"] || "http://localhost:3000").replace(/\/$/, "");
  },
  get demoLoginEnabled() {
    const flag = process.env.ENABLE_DEMO_LOGIN;
    if (flag === "true") return true;
    if (flag === "false") return false;
    return !isProduction;
  },
  get sessionSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      if (isProduction && process.env.NEXT_PHASE !== "phase-production-build") {
        throw new Error("SESSION_SECRET must be set to at least 32 characters in production.");
      }
      return "dev-only-insecure-session-secret-do-not-use-in-prod";
    }
    return secret;
  },
  get cronSecret() {
    return process.env.CRON_SECRET || "";
  },
};

/** Values that are safe to hand to client components as props. */
export function publicGameConfig() {
  return {
    quorum: gameConfig.quorum,
    deliberationHours: Math.round((gameConfig.deliberationMs / 3_600_000) * 10) / 10,
    claimMinutes: Math.round(gameConfig.claimMs / 60_000),
    maxExtensions: gameConfig.maxExtensions,
  };
}
export type PublicGameConfig = ReturnType<typeof publicGameConfig>;
