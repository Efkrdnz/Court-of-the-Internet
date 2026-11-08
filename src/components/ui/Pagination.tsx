import Link from "next/link";
import clsx from "clsx";

export function Pagination({
  page,
  pages,
  basePath,
  params,
}: {
  page: number;
  pages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const window = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link className="btn btn-ghost btn-sm" href={href(page - 1)} rel="prev">
          ← Previous
        </Link>
      ) : null}
      {window.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - window[i - 1] > 1 ? <span className="text-parchment/50">…</span> : null}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={clsx("chip min-w-10 justify-center", p === page && "chip-active")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link className="btn btn-ghost btn-sm" href={href(page + 1)} rel="next">
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
