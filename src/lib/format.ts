export function relativeTime(iso: string | Date, now: Date = new Date()): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 86_400_000],
    ["month", 30 * 86_400_000],
    ["week", 7 * 86_400_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return diff < 0 ? "just now" : "in a moment";
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function formatMonth(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
}

export function percent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function compact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function durationShort(ms: number): string {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export const STATUS_LABEL: Record<string, string> = {
  AWAITING_DEFENSE: "Awaiting Defense",
  DEFENSE_CLAIMED: "Defense Drafting",
  AWAITING_PROSECUTION: "Awaiting Prosecution",
  PROSECUTION_CLAIMED: "Prosecution Drafting",
  DELIBERATION: "Jury Deliberating",
  CLOSED: "Closed",
};

export const VERDICT_LABEL: Record<string, string> = {
  GUILTY: "Guilty",
  NOT_GUILTY: "Not Guilty",
  MISTRIAL: "Mistrial",
  DISMISSED: "Dismissed",
};

export const MODERATION_STATE_LABEL: Record<string, string> = {
  VISIBLE: "Visible",
  UNDER_REVIEW: "Under review",
  REMOVED: "Sealed",
};

const MOD_ACTION_LABEL: Record<string, string> = {
  ADJOURN_NOW: "Adjourned",
  DISMISS_REPORTS: "Dismissed reports",
  GRANT_COSMETIC: "Granted cosmetic",
  PIN_FEATURED: "Pinned as featured",
  REMOVE_CASE: "Sealed case",
  RESTORE_CASE: "Restored case",
  BAN_USER: "Held in contempt",
  STRIKE_VOTE: "Struck a juror's vote (contempt)",
  UNBAN_USER: "Lifted contempt",
  STRIKE_DEFENSE: "Struck defense",
  STRIKE_PROSECUTION: "Struck prosecution",
  UNSTRIKE_DEFENSE: "Reinstated defense",
  UNSTRIKE_PROSECUTION: "Reinstated prosecution",
};

/** A readable name for a moderation log entry ("SET_ROLE_MODERATOR" → "Set role: moderator"). */
export function moderationActionLabel(action: string): string {
  if (MOD_ACTION_LABEL[action]) return MOD_ACTION_LABEL[action];
  const role = /^SET_ROLE_(\w+)$/.exec(action);
  if (role) return `Set role: ${role[1].toLowerCase()}`;
  return action.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}
