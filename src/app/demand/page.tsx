import { Activity } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-static";
export const metadata = { title: "Power Demand" };

export default function DemandPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Power Demand"
        subtitle="System demand context — peak and energy demand, requirement vs availability, deficits, and seasonal load patterns."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />
      <EmptyState
        icon={Activity}
        title="Power Demand — coming soon"
        description="Peak demand, energy requirement vs availability, energy & peak deficits, and seasonal / daily load patterns will appear here. Built in a later phase."
      />
    </div>
  );
}
