import { cleanQuery, pageParam } from "@/lib/text";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import type { Verdict } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { listArchive, type ArchiveSort } from "@/server/queries/cases";
import { getFeaturedCase } from "@/server/queries/community";
import { runMaintenance } from "@/server/services/maintenance";
import { CATEGORIES, isCategoryKey } from "@/lib/categories";
import { casePath } from "@/lib/text";
import { CaseFileCard } from "@/components/case/CaseFileCard";
import { Pagination } from "@/components/ui/Pagination";
import { EvidenceFolder, IconSearch, Scales } from "@/components/art/props";
import { TumbleweedDocket } from "@/components/art/scenes";

export const metadata: Metadata = {
  title: "Public case archives",
  description: "Every verdict ever reached by the Court of the Internet: searchable, sortable, shareable.",
};

const SORTS: { key: ArchiveSort; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "popular", label: "Most popular" },
  { key: "controversial", label: "Most controversial" },
  { key: "funniest", label: "Funniest" },
];
const VERDICTS: { key: Verdict; label: string }[] = [
  { key: "GUILTY", label: "Guilty" },
  { key: "NOT_GUILTY", label: "Not guilty" },
  { key: "MISTRIAL", label: "Mistrial" },
  { key: "DISMISSED", label: "Dismissed" },
];

export default async function ArchivesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await runMaintenance();
  const sp = await searchParams;
  const user = await getCurrentUser();
  const viewer = user ? { id: user.id, mutedCategories: user.mutedCategories } : null;
  const q = cleanQuery(sp.q);
  const category = sp.category && isCategoryKey(sp.category) ? sp.category : undefined;
  const verdict = VERDICTS.find((v) => v.key === sp.verdict)?.key;
  const sort = SORTS.find((s) => s.key === sp.sort)?.key ?? "recent";
  const page = pageParam(sp.page);
  const [archive, featured] = await Promise.all([listArchive({ q, category, verdict, sort, page, viewer }), page === 1 && !q ? getFeaturedCase(viewer) : null]);
  const vc = archive.verdictCounts;
  const decided = vc.GUILTY + vc.NOT_GUILTY + vc.MISTRIAL + vc.DISMISSED;
  const params = { q: q || undefined, category, verdict, sort: sort === "recent" ? undefined : sort };
  const href = (over: Record<string, string | undefined>) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...over })) if (v) s.set(k, v);
    const qs = s.toString();
    return qs ? `/archives?${qs}` : "/archives";
  };
  // Past the last page (an old link or a hand-edited URL): go to the last real page.
  if (archive.page > archive.pages) redirect(href({ page: archive.pages > 1 ? String(archive.pages) : undefined }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="animate-in">
          <p className="eyebrow">The permanent record</p>
          <h1 className="mt-2 font-display text-4xl font-black text-parchment sm:text-6xl">
            Public <span className="gilded-text italic">archives</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-parchment/75">Every verdict this court has ever reached, preserved for posterity, legal scholarship, and screenshots.</p>
        </div>
        <EvidenceFolder label="ARCHIVES" className="prp-hover hidden w-56 md:block" />
      </header>

      {/* Verdict statistics */}
      <section aria-label="Verdict statistics" className="velvet mt-8 grid grid-cols-1 gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
        <Scales tilt={vc.GUILTY > vc.NOT_GUILTY ? "left" : vc.GUILTY < vc.NOT_GUILTY ? "right" : "level"} className="mx-auto h-24 w-32 text-gold" />
        <div>
          <p className="font-display text-2xl font-bold text-parchment">
            {decided} cases closed · {vc.GUILTY + vc.NOT_GUILTY ? Math.round((vc.GUILTY / (vc.GUILTY + vc.NOT_GUILTY)) * 100) : 0}% conviction rate (guilty vs. not guilty)
          </p>
          <div className="mt-3 flex h-4 overflow-hidden rounded-full ring-1 ring-gold/30" aria-hidden>
            <div className="bg-crimson" style={{ width: `${decided ? (vc.GUILTY / decided) * 100 : 0}%` }} />
            <div className="bg-teal" style={{ width: `${decided ? (vc.NOT_GUILTY / decided) * 100 : 0}%` }} />
            <div className="bg-plum" style={{ width: `${decided ? (vc.MISTRIAL / decided) * 100 : 0}%` }} />
            <div className="bg-charcoal-2" style={{ width: `${decided ? (vc.DISMISSED / decided) * 100 : 0}%` }} />
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-parchment/75">
            <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-crimson" />Guilty {vc.GUILTY}</li>
            <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-teal" />Not guilty {vc.NOT_GUILTY}</li>
            <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-plum" />Mistrial {vc.MISTRIAL}</li>
            <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-charcoal-2 ring-1 ring-parchment/40" />Dismissed {vc.DISMISSED}</li>
          </ul>
        </div>
      </section>

      {featured ? (
        <section aria-labelledby="featured-heading" className="mt-10">
          <h2 id="featured-heading" className="eyebrow mb-1">Featured case of the day</h2>
          <CaseFileCard c={featured} className="ring-2 ring-gold/60" footer={<Link href={casePath(featured)} className="btn btn-sm">Read the full transcript</Link>} />
        </section>
      ) : null}

      {/* Search & filters */}
      <form action="/archives" method="get" role="search" className="on-dark mt-10 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search the archives</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gold-light/70" />
          <input name="q" defaultValue={q} placeholder="Search titles, confessions, or case numbers…" className="input !pl-10" />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select name="category" defaultValue={category ?? ""} className="select">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Verdict</span>
          <select name="verdict" defaultValue={verdict ?? ""} className="select">
            <option value="">Any verdict</option>
            {VERDICTS.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        {sort !== "recent" ? <input type="hidden" name="sort" value={sort} /> : null}
        <button type="submit" className="btn">
          Search
        </button>
      </form>
      <nav aria-label="Sort" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {SORTS.map((s) => (
          <Link key={s.key} href={href({ sort: s.key === "recent" ? undefined : s.key, page: undefined })} className={clsx("chip", sort === s.key && "chip-active")} aria-current={sort === s.key ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-sm text-parchment/60" aria-live="polite">
        {archive.total} {archive.total === 1 ? "case" : "cases"} found{q ? ` for “${q}”` : ""}
      </p>
      {archive.cards.length === 0 ? (
        <div className="velvet mt-4 flex flex-col items-center p-10 text-center">
          <TumbleweedDocket className="w-full max-w-sm" />
          <p className="mt-4 font-display text-2xl font-bold text-parchment">No precedent found.</p>
          <p className="mt-1 text-parchment/70">Even this court hasn&apos;t seen that one. Yet.</p>
          <Link href="/archives" className="btn btn-ghost mt-6">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {archive.cards.map((c) => (
            <CaseFileCard key={c.id} c={c} />
          ))}
        </div>
      )}
      <Pagination page={archive.page} pages={archive.pages} basePath="/archives" params={params} />
    </div>
  );
}
