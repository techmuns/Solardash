import Link from "next/link";
import { getProvenance } from "@/data";
import { formatDate } from "@/lib/utils";

export function Footer() {
  const provenance = getProvenance();
  const asOf = provenance
    .map((p) => p.updatedAt)
    .reduce((m, a) => (a > m ? a : m), provenance[0]?.updatedAt ?? "");

  return (
    <footer className="mt-8 border-t border-border bg-card/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-foreground">
              Solar Sector Dashboard
            </span>{" "}
            · Powered by{" "}
            <span className="font-medium text-foreground">Munshot</span>
          </p>
          <p className="flex items-center gap-3">
            <span>Data as of {formatDate(asOf)}</span>
            <Link
              href="/data-sources"
              className="font-medium text-foreground transition-colors hover:text-brand"
            >
              Data &amp; methodology
            </Link>
          </p>
        </div>
        <p className="mt-3 max-w-3xl text-2xs leading-relaxed text-muted-foreground">
          The Solar Sector Dashboard compiles public data (MNRE, CEA, SECI,
          company filings) and analyst estimates; figures tagged{" "}
          <span className="font-medium text-foreground">&ldquo;modelled&rdquo;</span> are
          Munshot estimates. For research only — not investment advice.
        </p>
      </div>
    </footer>
  );
}
