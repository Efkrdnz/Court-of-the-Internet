import { JudgeOwl } from "@/components/art/characters";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-16">
      <div className="hidden text-center lg:block">
        <JudgeOwl className="chr-hover chr-sticker mx-auto w-full max-w-sm" />
        <p className="mt-4 font-display text-2xl italic text-parchment/80">“State your name for the record.”</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
