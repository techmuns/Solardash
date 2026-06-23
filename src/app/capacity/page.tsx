import { Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-static";
export const metadata = { title: "Capacity & Generation" };

export default function CapacityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacity & Generation"
        subtitle="Installed capacity by source and state, monthly additions, plant load factors (PLF / CUF), and the generation mix."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />
      <EmptyState
        icon={Zap}
        title="Capacity & Generation — coming soon"
        description="Installed capacity by source & state, monthly capacity additions, PLF / CUF trends, and the evolving generation mix will appear here. Built in a later phase."
      />
    </div>
  );
}
