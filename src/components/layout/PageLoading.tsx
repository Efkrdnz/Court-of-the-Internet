import { GavelLoading } from "@/components/art/scenes";
import { LoadingLine } from "@/components/ui/LoadingLine";

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4" role="status" aria-live="polite">
      <div className="doc grid h-28 w-28 place-items-center rounded-full p-4">
        <GavelLoading className="w-full" />
      </div>
      <LoadingLine />
    </div>
  );
}
