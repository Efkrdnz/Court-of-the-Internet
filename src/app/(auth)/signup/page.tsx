import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { SignupForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Join the court" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/court";
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="doc doc-ruled p-6 sm:p-8">
      <p className="eyebrow !text-burgundy">Swearing-in ceremony</p>
      <h1 className="mt-1 font-display text-4xl font-black text-ink">Join the Court of the Internet</h1>
      <p className="muted mb-6 mt-1">
        Confess your pettiest crimes, defend strangers, prosecute the guilty, and judge them all. No email required: just a name and a solemn oath.
      </p>
      <SignupForm next={next} />
    </div>
  );
}
