import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUserOrRedirect } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { getCaseDetail } from "@/server/queries/cases";
import { refreshCase } from "@/server/services/maintenance";
import { casePath, formatCaseNumber } from "@/lib/text";
import { getCategory } from "@/lib/categories";
import { ArgumentPanel } from "./ArgumentPanel";
import { ArgumentEditor } from "./ArgumentEditor";
import { CategoryIcon } from "@/components/art/props";

export async function EditorPage({ role, caseId }: { role: "DEFENSE" | "PROSECUTION"; caseId: string }) {
  const base = role === "DEFENSE" ? "/defend" : "/prosecute";
  const user = await requireUserOrRedirect(`${base}/${caseId}`);
  const ref = await db.case.findUnique({ where: { id: caseId }, select: { id: true, number: true, slug: true } });
  if (!ref) notFound();
  await refreshCase(ref.id);
  const detail = await getCaseDetail(ref.number, { id: user.id, role: user.role });
  if (!detail || detail.kind !== "ok") notFound();
  const c = detail.case;
  const expected = role === "DEFENSE" ? "DEFENSE_CLAIMED" : "PROSECUTION_CLAIMED";
  // Only the current, unexpired claim holder may open the editor.
  if (c.status !== expected || !c.viewer.holdsClaim || !c.claimExpiresAt) redirect(casePath(c));
  const cat = getCategory(c.category);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={base} className="text-sm font-semibold text-gold-light hover:underline">
        ← Back to the {role === "DEFENSE" ? "defense" : "prosecution"} docket
      </Link>
      <header className="mt-4 flex flex-wrap items-center gap-4">
        <CategoryIcon category={c.category} className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">
            Case No. {formatCaseNumber(c.number)} · {cat.label}
          </p>
          <h1 className="hyphens-auto font-display text-2xl font-black leading-tight text-parchment min-[400px]:text-3xl sm:text-4xl">{c.title}</h1>
        </div>
      </header>
      <div className="mt-8 space-y-6">
        <ArgumentPanel kind="confession" person={c.accused} body={c.confession} context={detail.context} filedAt={c.createdAt} category={c.category} />
        {role === "PROSECUTION" ? (
          <ArgumentPanel kind="defense" person={c.attorney} body={detail.defense?.body ?? null} stricken={detail.defense?.stricken} filedAt={detail.defense?.createdAt} flip />
        ) : null}
      </div>
      <section className="mt-10" aria-labelledby="editor-heading">
        <h2 id="editor-heading" className="mb-4 font-display text-2xl font-bold text-parchment">
          {role === "DEFENSE" ? "Draft the defense" : "Draft the prosecution"}
        </h2>
        <ArgumentEditor caseId={c.id} role={role} expiresAt={c.claimExpiresAt} />
      </section>
    </div>
  );
}
