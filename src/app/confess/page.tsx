import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { publicGameConfig } from "@/server/config";
import { ConfessionForm } from "@/components/forms/ConfessionForm";
import { HamsterDefendant } from "@/components/art/characters";
import { FormAlert } from "@/components/ui/FormAlert";

export const metadata: Metadata = {
  title: "Confess a crime",
  description: "Confess your pettiest crime to the Court of the Internet and let strangers decide your fate.",
};

export default async function ConfessPage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10 grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="animate-in">
          <p className="eyebrow">Game mode · The Accused</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-tight text-parchment sm:text-6xl">
            Confess a <span className="gilded-text italic">crime</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-parchment/75">
            Unburden your conscience. Strangers will defend you, prosecute you, and judge you. Only harmless, petty, or fictional crimes, please. This court has
            standards (low ones).
          </p>
        </div>
        <HamsterDefendant nervous className="chr-hover chr-sticker hidden w-44 md:block" />
      </header>
      {!user ? (
        <div className="velvet mx-auto max-w-xl p-8 text-center">
          <p className="font-display text-2xl font-bold text-parchment">The court requires a name for its records.</p>
          <p className="mt-2 text-parchment/70">Sign in to confess. You can still choose to appear anonymously.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link className="btn" href="/signup?next=/confess">
              Join the court
            </Link>
            <Link className="btn btn-ghost" href="/login?next=/confess">
              Log in
            </Link>
          </div>
        </div>
      ) : user.bannedAt ? (
        <FormAlert>You are banned and cannot file new confessions.</FormAlert>
      ) : (
        <ConfessionForm displayName={user.displayName} {...publicGameConfig()} />
      )}
    </div>
  );
}
