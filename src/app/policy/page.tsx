import { getPolicySnapshot } from "@/data";
import { formatCompact, formatDate, formatNumber, formatUnit } from "@/lib/utils";
import { FillBarSeries } from "@/components/charts/FillCharts";
import {
  SectionCanvas,
  type CanvasKpi,
  type CanvasTab,
} from "@/components/sections/SectionCanvas";
import type { Kpi, Series } from "@/data/types/core";
import type { PolicyData } from "@/data/types/policy";

export const dynamic = "force-static";
export const metadata = {
  title: "Policy & Pricing",
  description:
    "India's solar / renewable policy toolkit — the scheme tracker, PM Surya Ghar, PM-KUSUM, and the round-the-clock levelised cost benchmark.",
};

function kv(k?: Kpi): string {
  if (!k) return "—";
  if (typeof k.value === "string") return k.value;
  return Number.isInteger(k.value)
    ? formatNumber(k.value)
    : parseFloat(k.value.toFixed(2)).toString();
}
const find = (kpis: Kpi[], key: string) => kpis.find((k) => k.key === key);
const mapKpi = (k?: Kpi): CanvasKpi => ({
  label: k?.label ?? "—",
  value: kv(k),
  unit: k?.unit ? formatUnit(k.unit) : undefined,
  hint: k?.hint,
});

function metricValue(value: number, unit: string): string {
  if (unit === "count") return formatCompact(value);
  if (unit === "Rs_cr") return `₹${formatNumber(value)} cr`;
  return `${formatNumber(value)} ${unit}`;
}

function SchemeTable({ items }: { items: PolicyData["schemes"] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-card text-left text-2xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Scheme</th>
            <th className="px-3 py-2 font-semibold">Category</th>
            <th className="px-3 py-2 font-semibold">Key metric</th>
            <th className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.scheme} className="border-t border-border/70">
              <td className="px-3 py-2 font-medium text-foreground">
                {s.scheme}
              </td>
              <td className="px-3 py-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
                  {s.category}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{s.keyMetric}</td>
              <td className="px-3 py-2 text-muted-foreground">{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricGrid({ items }: { items: PolicyData["pmSuryaGhar"] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((m) => (
          <div key={m.metric} className="rounded-xl border border-border p-4">
            <p className="text-2xs uppercase tracking-wide text-muted-foreground">
              {m.metric}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {metricValue(m.value, m.unit)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LcoeCard({ item }: { item: PolicyData["prices"][number] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {item.item}
      </p>
      <p className="text-5xl font-bold tabular-nums text-brand">
        ₹{item.value.toFixed(2)}
        <span className="ml-1 text-xl font-medium text-muted-foreground">
          /kWh
        </span>
      </p>
      <p className="text-sm text-muted-foreground">
        {item.note} · round-the-clock solar-plus-storage benchmark
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        Approaching new-coal tariffs — making firm, dispatchable renewable
        power competitive for baseload.
      </p>
    </div>
  );
}

export default function PolicyPage() {
  const snap = getPolicySnapshot();
  const d = snap.data;
  const source = "MNRE / CBIC";
  const asOf = formatDate(snap.updatedAt);

  const install = d.pmSuryaGhar.find((m) => m.metric === "Installations");
  const target = d.pmSuryaGhar.find((m) => m.metric === "Target");
  const kusumExecuted = d.kusum.reduce((s, k) => s + k.executedGw, 0);
  const kusumTarget = d.kusum.reduce((s, k) => s + k.targetGw, 0);
  const lcoe = d.prices.find((p) => /lcoe/i.test(p.item)) ?? d.prices[0];

  const kpis: CanvasKpi[] = [
    mapKpi(find(d.kpis, "active_schemes")),
    {
      label: "PM Surya Ghar installs",
      value: install ? formatCompact(install.value) : "—",
      hint: target ? `of ${formatCompact(target.value)} target` : undefined,
    },
    {
      label: "KUSUM executed",
      value: `${kusumExecuted}`,
      unit: "GW",
      hint: `of ${kusumTarget} GW target`,
    },
    {
      label: lcoe?.item ?? "LCOE",
      value: lcoe ? lcoe.value.toFixed(2) : "—",
      unit: "₹/kWh",
      hint: lcoe?.note,
    },
  ];

  const kusumSeries: Series[] = [
    {
      key: "executed",
      label: "Executed",
      color: "#10B981",
      points: d.kusum.map((k) => ({ period: k.component, value: k.executedGw })),
    },
    {
      key: "target",
      label: "Target",
      color: "#CBD5E1",
      points: d.kusum.map((k) => ({ period: k.component, value: k.targetGw })),
    },
  ];
  const kusumPeriods = d.kusum.map((k) => k.component);

  const tabs: CanvasTab[] = [
    {
      id: "schemes",
      label: "Schemes",
      title: "Scheme tracker",
      subtitle: "Manufacturing · demand · consumer policy · by category",
      source,
      body: <SchemeTable items={d.schemes} />,
    },
    {
      id: "surya",
      label: "PM Surya Ghar",
      title: "PM Surya Ghar · Muft Bijli",
      subtitle: "Rooftop-solar scheme · installs, target, pipeline & allocation",
      source: "MNRE",
      body: <MetricGrid items={d.pmSuryaGhar} />,
    },
    {
      id: "kusum",
      label: "KUSUM",
      title: "PM-KUSUM · executed vs target",
      subtitle:
        "GW · A: ground-mount · B: standalone pumps · C: feeder solarisation",
      source: "MNRE",
      body: (
        <FillBarSeries
          series={kusumSeries}
          unit="GW"
          periodOrder={kusumPeriods}
        />
      ),
    },
    {
      id: "lcoe",
      label: "Levelised cost",
      title: "Levelised cost of energy",
      subtitle: "Round-the-clock solar-plus-storage benchmark",
      source: "Ember",
      body: lcoe ? (
        <LcoeCard item={lcoe} />
      ) : (
        <p className="p-4 text-sm text-muted-foreground">No LCOE benchmark.</p>
      ),
    },
  ];

  return (
    <SectionCanvas kpis={kpis} tabs={tabs} asOf={asOf} defaultSource={source} />
  );
}
