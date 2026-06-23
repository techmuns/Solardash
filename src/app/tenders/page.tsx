import { Gavel } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-static";
export const metadata = { title: "Tenders & Auctions" };

export default function TendersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenders & Auctions"
        subtitle="The hub of the terminal: central & state solar / renewable tenders, auction results, winning tariffs, capacities, and the live pipeline."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />
      <EmptyState
        icon={Gavel}
        title="Tenders & Auctions — coming soon"
        description="Tender issuances, bid submissions, auction results with winning developers and tariffs, capacity awarded by source, and pipeline tracking will live here. Built in a later phase."
      />
    </div>
  );
}
