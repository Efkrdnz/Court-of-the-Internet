/**
 * Audits every player's stored statistics against a full recomputation from history
 * (cases, arguments, votes, XP ledger). Exits non-zero on any mismatch.
 *
 *   npx tsx --conditions=react-server scripts/audit-stats.ts
 */
import { db } from "../src/server/db";
import { auditStats } from "../src/server/services/stats";

async function main() {
  const users = await db.user.findMany({ select: { id: true, username: true } });
  let bad = 0;
  for (const u of users) {
    const result = await auditStats(u.id);
    if (!result.ok) {
      bad++;
      console.error(`MISMATCH @${u.username}:`, result.mismatches);
    }
  }
  const cases = await db.case.count({ where: { status: "CLOSED" } });
  console.log(`Audited ${users.length} players across ${cases} closed cases: ${bad === 0 ? "all statistics match history" : `${bad} mismatched`}.`);
  if (bad) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
