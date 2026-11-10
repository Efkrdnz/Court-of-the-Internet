import "server-only";

export type CourtErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "BANNED"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "CONFLICT"
  | "ALREADY_DONE"
  | "VALIDATION"
  | "CONTENT_REJECTED"
  | "RATE_LIMITED"
  | "INELIGIBLE";

/** An error whose message is safe to show to players. */
export class CourtError extends Error {
  constructor(
    public readonly code: CourtErrorCode,
    message: string,
    public readonly field?: string,
    /** A page that resolves it (e.g. the case already on file), shown as a link. */
    public readonly href?: string,
  ) {
    super(message);
    this.name = "CourtError";
  }
}

export function isCourtError(e: unknown): e is CourtError {
  return e instanceof CourtError;
}

/** Prisma unique-constraint violation. */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}
