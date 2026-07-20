import { ExternalLink } from "lucide-react";
import { getPolicySnapshot } from "@/data";
import { formatDate } from "@/lib/utils";
import { snapshotMeta } from "@/lib/export";
import {
  SectionCanvas,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { PolicyData } from "@/data/types/policy";

export const dynamic = "force-static";
export const metadata = {
  title: "Policy & Pricing",
  description:
    "India's solar / renewable policy toolkit — a live scheme tracker with announcement dates, highlights and official source links.",
};

function SchemeTable({ items }: { items: PolicyData["schemes"] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card text-left text-2xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Scheme</th>
            <th className="px-3 py-2 font-semibold">Category</th>
            <th className="whitespace-nowrap px-3 py-2 font-semibold">Announced</th>
            <th className="px-3 py-2 font-semibold">What it is</th>
            <th className="px-3 py-2 font-semibold">Companies affected &amp; how</th>
            <th className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.scheme} className="border-t border-border/70 align-top">
              <td className="px-3 py-2 font-medium text-foreground">
                {s.sourceUrl ? (
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1 hover:text-brand"
                    title="Official source"
                  >
                    <span className="max-w-[12rem]">{s.scheme}</span>
                    <ExternalLink
                      className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60"
                      aria-hidden
                    />
                  </a>
                ) : (
                  <span className="max-w-[12rem]">{s.scheme}</span>
                )}
              </td>
              <td className="px-3 py-2">
                <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
                  {s.category}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                {s.announced ?? "—"}
              </td>
              <td className="max-w-[24rem] px-3 py-2">
                <p className="leading-snug text-foreground/90">{s.highlights ?? "—"}</p>
                {s.keyMetric && (
                  <p className="mt-1 text-2xs leading-snug text-muted-foreground">
                    <span className="font-medium text-muted-foreground/80">Key:</span>{" "}
                    {s.keyMetric}
                  </p>
                )}
              </td>
              <td className="max-w-[22rem] px-3 py-2 leading-snug text-muted-foreground">
                {s.companiesAffected ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {s.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PolicyPage() {
  const snap = getPolicySnapshot();
  const d = snap.data;
  const source = "MNRE / CBIC / PIB";
  const asOf = formatDate(snap.updatedAt);
  const meta = (dataset: string) => snapshotMeta(snap, { dataset });

  const tabs: CanvasTab[] = [
    {
      id: "schemes",
      label: "Schemes",
      title: "Scheme tracker",
      subtitle:
        "India's solar / RE policy toolkit · latest announcements first · with source links",
      source,
      body: <SchemeTable items={d.schemes} />,
      exportData: {
        columns: [
          { key: "scheme", label: "Scheme" },
          { key: "category", label: "Category" },
          { key: "announced", label: "Announced" },
          { key: "highlights", label: "What it is" },
          { key: "keyMetric", label: "Key metric" },
          { key: "companiesAffected", label: "Companies affected & how" },
          { key: "status", label: "Status" },
          { key: "sourceUrl", label: "Source" },
        ],
        rows: d.schemes.map((s) => ({
          scheme: s.scheme,
          category: s.category,
          announced: s.announced ?? null,
          highlights: s.highlights ?? null,
          keyMetric: s.keyMetric,
          companiesAffected: s.companiesAffected ?? null,
          status: s.status,
          sourceUrl: s.sourceUrl ?? null,
        })),
        meta: meta("schemes"),
      },
    },
  ];

  return <SectionCanvas tabs={tabs} asOf={asOf} defaultSource={source} />;
}
