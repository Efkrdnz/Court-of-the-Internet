/**
 * Validates a post-login "next" path. Only same-origin paths are allowed. Browsers treat
 * "//host", "/\host" and paths with tabs/newlines (stripped while parsing) as other origins,
 * so anything with a backslash or control character is refused, and the result must resolve
 * to our own origin.
 */
export function safeNext(value: unknown, fallback = "/court"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const base = "http://court.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // Re-check after normalisation: "/..//evil.example" resolves to "//evil.example", which a
    // browser would treat as another host.
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

/** A path plus its search params, for a login redirect's `next` (kept short enough for safeNext). */
export function withQuery(path: string, params?: Record<string, string | string[] | undefined>): string {
  if (!params) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) qs.append(key, v);
  }
  const query = qs.toString();
  // A query too long to round-trip sensibly isn't worth keeping; the page itself still opens.
  return query && path.length + query.length < 512 ? `${path}?${query}` : path;
}
