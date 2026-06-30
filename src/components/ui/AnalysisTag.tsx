import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Munshot analysis" tag — the visual marker that separates our INTERPRETATION
 * from sourced FACT (the two-tier integrity law). Wherever a reading, a colour
 * judgement, or a thesis appears, this tag sits next to it.
 */
export function AnalysisTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-brand/40 bg-brand/5 px-1.5 py-0.5 align-middle text-2xs font-medium text-brand",
        className,
      )}
    >
      <FlaskConical className="h-3 w-3" aria-hidden />
      Munshot analysis
    </span>
  );
}
