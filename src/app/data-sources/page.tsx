import { Database } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-static";
export const metadata = { title: "Data & Methodology" };

export default function DataSourcesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Data & Methodology"
        subtitle="How the numbers are built — every dataset's source, definitions, update cadence, and our confidence methodology."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />
      <EmptyState
        icon={Database}
        title="Data & Methodology — coming soon"
        description="A catalogue of every source with definitions, update cadence, the { value, unit, source, confidence, asOf } data contract, and the manual-data layer will appear here. Built in a later phase."
      />
    </div>
  );
}
