import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-static";
export const metadata = { title: "Developers / IPPs" };

export default function DevelopersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Developers / IPPs"
        subtitle="Independent power producers across the sector — operational and under-construction portfolios, auction win-rates, and capacity pipelines."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />
      <EmptyState
        icon={Building2}
        title="Developers / IPPs — coming soon"
        description="Developer profiles, portfolio capacity by source & stage, auction win-rates, and pipeline-to-operational conversion will appear here. Built in a later phase."
      />
    </div>
  );
}
