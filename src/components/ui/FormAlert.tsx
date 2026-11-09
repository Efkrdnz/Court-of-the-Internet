import clsx from "clsx";

export function FormAlert({ kind = "error", children, className }: { kind?: "error" | "success" | "info"; children: React.ReactNode; className?: string }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      tabIndex={-1}
      className={clsx(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold",
        kind === "error" && "border-crimson/60 bg-crimson/15 text-[#ffd2d2]",
        kind === "success" && "border-teal-light/60 bg-teal/20 text-[#cdf3e8]",
        kind === "info" && "border-gold/50 bg-gold/10 text-gold-light",
        className,
      )}
    >
      <span aria-hidden className="mt-0.5 font-display text-base leading-none">
        {kind === "error" ? "§" : kind === "success" ? "✓" : "i"}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function FieldError({ id, errors }: { id?: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {errors[0]}
    </p>
  );
}
