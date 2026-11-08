import Link from "next/link";
import { FlourishDivider } from "@/components/art/props";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-gold/20 bg-night/60">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <FlourishDivider className="mx-auto mb-8 h-6 w-full max-w-md text-gold/70" />
        <div className="grid gap-8 text-sm text-parchment/70 sm:grid-cols-3">
          <div>
            <p className="font-blackletter text-2xl text-gold-light">Court of the Internet</p>
            <p className="mt-2 max-w-xs">
              A deeply serious legal institution for profoundly unserious crimes. All cases are confessions of harmless,
              petty or fictional misdeeds, judged for entertainment only.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-2">
            <Link className="hover:text-gold-light" href="/archives">Public archives</Link>
            <Link className="hover:text-gold-light" href="/leaderboards">Leaderboards</Link>
            <Link className="hover:text-gold-light" href="/jury">Jury duty</Link>
            <Link className="hover:text-gold-light" href="/confess">Confess a crime</Link>
            <Link className="hover:text-gold-light" href="/rules">Community rules</Link>
            <Link className="hover:text-gold-light" href="/#how-it-works">How it works</Link>
          </nav>
          <div className="space-y-2">
            <p>
              <strong className="text-parchment">This is not a real court.</strong> Do not report real crimes, accuse real people,
              or share anyone&apos;s personal information. Real emergencies go to real authorities.
            </p>
            <p className="text-parchment/50">No pigeons were harmed in the making of this courtroom.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
