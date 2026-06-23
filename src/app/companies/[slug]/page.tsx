import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, LineChart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { humanizeSlug } from "@/lib/utils";

export const dynamic = "force-static";
export const dynamicParams = true;

// A few real sector names are pre-rendered so the template ships statically;
// any other slug renders on demand. The real roster arrives with the data layer.
const EXAMPLE_SLUGS = [
  "adani-green-energy",
  "tata-power",
  "ntpc-green-energy",
  "waaree-energies",
  "premier-energies",
  "websol-energies",
];

export function generateStaticParams() {
  return EXAMPLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: humanizeSlug(slug) };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = humanizeSlug(slug);

  return (
    <div className="space-y-6">
      <Link
        href="/companies"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All companies
      </Link>

      <PageHeader
        title={name}
        subtitle="Listed company — per-stock financials, segment exposure, and valuation."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />

      <EmptyState
        icon={LineChart}
        title={`${name} — coming soon`}
        description={`The per-company page for "${slug}" will show financials, capacity & order-book exposure, and valuation. Built in a later phase.`}
      />
    </div>
  );
}
