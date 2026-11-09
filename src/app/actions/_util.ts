import "server-only";
import { z } from "zod";
import { isCourtError } from "@/server/errors";
import { fieldErrors, type FieldErrors } from "@/lib/validation";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

/** Converts thrown errors into user-safe results. Never leaks internals. */
export function toFailure(e: unknown): { ok: false; error: string; fieldErrors?: FieldErrors } {
  if (isCourtError(e)) {
    return { ok: false, error: e.message, fieldErrors: e.field ? { [e.field]: [e.message] } : undefined };
  }
  if (e instanceof z.ZodError) {
    const fe = fieldErrors(e);
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  // Re-throw Next.js control-flow errors (redirect / notFound).
  if (typeof e === "object" && e !== null && "digest" in e && typeof (e as { digest: unknown }).digest === "string") {
    const digest = (e as { digest: string }).digest;
    if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND") throw e;
  }
  // Hand-crafted requests with NUL bytes or other invalid text in ids reach Postgres as
  // "invalid byte sequence" (22021): that's bad input, not a server fault.
  if (e instanceof Error && /22021|invalid byte sequence|\\u0000|0x00/i.test(e.message)) {
    return { ok: false, error: "That request contained invalid characters." };
  }
  console.error("[action] unexpected error", e);
  return { ok: false, error: "The court stenographer fainted. Please try again." };
}

export function formObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (typeof value !== "string") continue;
    if (key in out) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else out[key] = value;
  }
  return out;
}

/** Honeypot: bots fill every field. Real players never see this one. */
export function isBot(formData: FormData): boolean {
  const trap = formData.get("website");
  return typeof trap === "string" && trap.length > 0;
}
