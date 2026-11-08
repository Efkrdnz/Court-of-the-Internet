import Link from "next/link";
import { ConfusedPigeon } from "@/components/art/scenes";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6">
      <div className="doc w-full max-w-xs p-4">
        <ConfusedPigeon className="w-full" />
      </div>
      <p className="eyebrow mt-8">Error 404 · Case not found</p>
      <h1 className="mt-2 font-display text-4xl font-black text-parchment sm:text-5xl">Objection! This page does not exist.</h1>
      <p className="mt-3 text-lg text-parchment/75">Our finest pigeon searched the entire docket. He found a crumb, a map (upside down), and no page.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn">
          Return to the courtroom
        </Link>
        <Link href="/archives" className="btn btn-ghost">
          Search the archives
        </Link>
      </div>
    </div>
  );
}
