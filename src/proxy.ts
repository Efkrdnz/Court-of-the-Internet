import { NextResponse, type NextRequest } from "next/server";

/**
 * A path with broken percent-encoding ("/cases/%E0%A4%A") makes Next's router throw while
 * decoding route params, which surfaces as a bare-text 500. Catch it first and answer 400.
 */
export function proxy(request: NextRequest) {
  try {
    decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return new NextResponse("Bad request: malformed URL encoding.", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return NextResponse.next();
}

export const config = {
  // Only the dynamic routes that decode params; static assets never reach this.
  matcher: ["/cases/:path*", "/u/:path*", "/defend/:path*", "/prosecute/:path*"],
};
