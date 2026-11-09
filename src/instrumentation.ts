/**
 * Runs once when the server starts. In production, refuse to start without a usable
 * SESSION_SECRET instead of failing later on every signed-in request.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 32 || secret.startsWith("dev-only-")) {
    // Exit rather than throw: a thrown error leaves Next running and answering 500s.
    console.error(
      "[court] SESSION_SECRET must be set to at least 32 random characters in production (not the .env.example placeholder). Refusing to start.",
    );
    process.exit(1);
  }
}
