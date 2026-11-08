import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { appConfig } from "@/server/config";
import { db } from "@/server/db";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { parseAvatar } from "@/lib/avatar";
import { demoLoginAction } from "@/app/actions/auth";
import { LoginForm } from "@/components/forms/AuthForms";
import { Avatar } from "@/components/art/avatar";
import { FormAlert } from "@/components/ui/FormAlert";

export const metadata: Metadata = { title: "Log in" };

function safeNext(v: unknown) {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/court";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);

  const demo = appConfig.demoLoginEnabled
    ? await db.user.findMany({
        where: { username: { in: DEMO_ACCOUNTS.map((d) => d.username) }, deletedAt: null },
        select: { username: true, displayName: true, avatar: true },
      })
    : [];

  return (
    <div className="space-y-8">
      <div className="doc doc-ruled p-6 sm:p-8">
        <p className="eyebrow !text-burgundy">Members of the bar</p>
        <h1 className="mt-1 font-display text-4xl font-black text-ink">Log in</h1>
        <p className="muted mb-6 mt-1">The court is in session. Please present your credentials to the bailiff.</p>
        <LoginForm next={next} />
      </div>

      {demo.length ? (
        <section aria-labelledby="demo-heading" className="velvet p-6">
          <h2 id="demo-heading" className="font-display text-xl font-bold text-parchment">
            Try it instantly: demo accounts
          </h2>
          <p className="mt-1 text-sm text-parchment/70">
            One click to sign in as a seeded player. Use different accounts in different browsers to play every role.
          </p>
          {sp.demo === "missing" ? <FormAlert className="mt-3">That demo account doesn&apos;t exist. Run the seed script first.</FormAlert> : null}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((d) => {
              const u = demo.find((x) => x.username === d.username);
              if (!u) return null;
              return (
                <li key={d.username}>
                  <form action={demoLoginAction}>
                    <input type="hidden" name="username" value={d.username} />
                    <input type="hidden" name="next" value={next} />
                    <button type="submit" className="flex w-full items-center gap-3 rounded-xl border border-gold/25 bg-night/40 p-3 text-left transition hover:border-gold-light hover:bg-burgundy/30">
                      <Avatar config={parseAvatar(u.avatar)} className="h-11 w-11 shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-bold text-parchment">
                          {u.displayName} {d.role === "ADMIN" ? <span className="pill ml-1 bg-gold text-ink">Admin</span> : d.role === "MODERATOR" ? <span className="pill ml-1 bg-gold/70 text-ink">Mod</span> : null}
                        </span>
                        <span className="block truncate text-xs text-parchment/60">{d.blurb}</span>
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
