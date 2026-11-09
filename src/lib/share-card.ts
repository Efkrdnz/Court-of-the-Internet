/** Stamp + footer line for a case's share card, by stage. */
export function shareCardStatus(status: string, verdict: string | null): { stamp: string; color: string; footer: string } {
  if (status === "CLOSED" && verdict) {
    const v: Record<string, { stamp: string; color: string }> = {
      GUILTY: { stamp: "GUILTY", color: "#b3202a" },
      NOT_GUILTY: { stamp: "NOT GUILTY", color: "#1f6f5c" },
      MISTRIAL: { stamp: "MISTRIAL", color: "#4b2a5e" },
      DISMISSED: { stamp: "DISMISSED", color: "#5c5254" },
    };
    return { ...(v[verdict] ?? v.DISMISSED), footer: "" };
  }
  if (status === "AWAITING_DEFENSE" || status === "DEFENSE_CLAIMED") {
    return { stamp: "NEEDS COUNSEL", color: "#1f6f5c", footer: "This defendant needs a lawyer. Take the case!" };
  }
  if (status === "AWAITING_PROSECUTION" || status === "PROSECUTION_CLAIMED") {
    return { stamp: "ON TRIAL", color: "#8c1d2f", footer: "The defense has spoken. Who will prosecute?" };
  }
  return { stamp: "JURY OUT", color: "#8a6d1c", footer: "The jury is still out. Cast your vote!" };
}
