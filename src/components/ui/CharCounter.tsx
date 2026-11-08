import clsx from "clsx";

export function CharCounter({ count, min, max, id }: { count: number; min?: number; max: number; id?: string }) {
  const over = count > max;
  const under = min !== undefined && count < min;
  const near = !over && count > max * 0.9;
  return (
    <p id={id} className={clsx("text-right font-type text-sm tabular-nums", over ? "text-crimson" : near ? "text-gold-dark" : "text-sepia")} aria-live="polite">
      {under ? `${min! - count} more to go · ` : ""}
      {count}/{max}
      {over ? " (over the limit)" : ""}
    </p>
  );
}
