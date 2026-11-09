import type { Metadata } from "next";
import Link from "next/link";
import { BailiffBulldog } from "@/components/art/characters";
import { OrnateCorner } from "@/components/art/props";

export const metadata: Metadata = { title: "Community rules", description: "The rules of the Court of the Internet: petty crimes only, no real harm." };

const ALLOWED = [
  "Harmless confessions: eating the last slice, stealing a single fry, muting the group chat.",
  "Petty social disputes: thermostat wars, chore standoffs, borrowed hoodies.",
  "Fictional or exaggerated wrongdoing, as long as it's obviously a bit.",
  "Gaming crimes, spoiler crimes, fashion crimes, and crimes against good taste.",
];

const FORBIDDEN = [
  ["No personal information", "No names of real private people, addresses, phone numbers, emails, handles, workplaces or anything that identifies someone. That includes you."],
  ["No serious accusations", "This is not a place to accuse real, identifiable people of anything, or to report real crimes. Real problems belong with real authorities."],
  ["No threats or violence", "No threats, no encouragement of violence or self-harm, no organising real-world harm, not even as a joke."],
  ["No harassment or hate", "No slurs, bullying, or attacks on anyone's identity. Roast the crime, not the person."],
  ["No sexual content", "Nothing sexual, and absolutely nothing involving minors."],
  ["No illegal content", "No drugs, weapons, fraud how-tos, or anything else illegal."],
  ["No spam", "No ads, links, copy-paste confessions, or flooding the docket."],
];

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <article className="doc doc-ruled relative px-6 py-10 sm:px-12">
        <OrnateCorner position="tl" className="absolute left-2 top-2 w-16 text-gold-dark" />
        <OrnateCorner position="tr" className="absolute right-2 top-2 w-16 text-gold-dark" />
        <OrnateCorner position="bl" className="absolute bottom-2 left-2 w-16 text-gold-dark" />
        <OrnateCorner position="br" className="absolute bottom-2 right-2 w-16 text-gold-dark" />
        <p className="text-center font-display text-sm font-bold uppercase tracking-[0.35em] text-burgundy">Rules of the Court</p>
        <h1 className="mt-2 text-center font-display text-4xl font-black sm:text-5xl">The Code of Pettiness</h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-ink/80">
          The Court of the Internet is a <strong>humorous, fictional courtroom game</strong>. We take tiny crimes extremely seriously, and real harm not at all.
          Break these rules and the bailiff will escort you out.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black">The court happily hears</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 font-type">
          {ALLOWED.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>

        <h2 className="mt-10 font-display text-2xl font-black">Contempt of court (forbidden)</h2>
        <ol className="mt-4 space-y-4">
          {FORBIDDEN.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="font-display text-3xl font-black text-burgundy">§{i + 1}</span>
              <div>
                <p className="font-bold">{title}</p>
                <p className="text-ink/80">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 font-display text-2xl font-black">How we enforce it</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>Submissions are automatically screened for personal info, links, slurs and threats.</li>
          <li>Anyone can report a case or argument, and every report reaches the clerks. Reports from three separate established players (accounts at least a day old) put a case under review automatically and hide it from public listings until a clerk decides.</li>
          <li>Moderators can seal cases, strike arguments from the record, and ban players. Every action is logged.</li>
          <li>Anonymous mode hides your name from everyone else, but moderators can still trace abuse to an account.</li>
          <li>Payments can never buy votes, verdicts, or rankings. Cosmetics only.</li>
        </ul>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-sepia/30 pt-6">
          <p className="max-w-md italic text-ink/75">“Order in the court! Unless it&apos;s an order of fries, in which case: one each, please.”</p>
          <Link href="/confess" className="btn btn-burgundy">
            I understand. Let me confess.
          </Link>
        </div>
      </article>
      <BailiffBulldog className="chr-hover chr-sticker mx-auto mt-10 w-56" />
    </div>
  );
}
