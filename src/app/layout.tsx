import type { Metadata, Viewport } from "next";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";
import "@fontsource/playfair-display/700-italic.css";
import "@fontsource/bricolage-grotesque/400.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/bricolage-grotesque/800.css";
import "@fontsource/special-elite/400.css";
import "@fontsource/unifrakturcook/700.css";
import "./globals.css";
import { getCurrentUser } from "@/server/auth/current-user";
import { pendingToasts } from "@/server/queries/players";
import { appConfig } from "@/server/config";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Toaster } from "@/components/ui/Toaster";
import { MotionProvider } from "@/components/ui/MotionProvider";

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.siteUrl),
  title: {
    default: "Court of the Internet: confess, defend, prosecute, judge",
    template: "%s · Court of the Internet",
  },
  description:
    "A multiplayer courtroom game for the internet's pettiest crimes. Confess, defend strangers, prosecute, and serve on a jury of your (judgmental) peers.",
  applicationName: "Court of the Internet",
  openGraph: {
    type: "website",
    siteName: "Court of the Internet",
    title: "Court of the Internet",
    description: "The internet's most prestigious court for its least important crimes.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#2a0a12",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const toasts = user ? await pendingToasts(user.id) : [];
  return (
    <html lang="en" data-motion={user?.reducedMotion ? "reduce" : undefined} className="h-full">
      <body className="flex min-h-full flex-col">
        <a href="#main" className="skip-link btn btn-sm">
          Skip to content
        </a>
        <MotionProvider reduce={!!user?.reducedMotion}>
          <SiteHeader user={user} />
          <main id="main" className="relative z-10 flex-1">
            {children}
          </main>
          <SiteFooter />
          {user ? <Toaster initial={toasts.map((t) => ({ ...t, data: t.data ?? null }))} /> : null}
        </MotionProvider>
      </body>
    </html>
  );
}
