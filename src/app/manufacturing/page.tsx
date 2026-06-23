import { Factory } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-static";
export const metadata = { title: "Manufacturing" };

export default function ManufacturingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing & Value Chain"
        subtitle="The domestic supply chain — module, cell, wafer and ingot capacity, ALMM & DCR, PLI awards, and import / export flows."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />
      <EmptyState
        icon={Factory}
        title="Manufacturing & Value Chain — coming soon"
        description="Module / cell / wafer / ingot capacity, ALMM-listed and DCR supply, PLI scheme awards, and trade flows across the value chain will appear here. Built in a later phase."
      />
    </div>
  );
}
