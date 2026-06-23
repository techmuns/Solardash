import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-static";
export const metadata = { title: "Policy & Pricing" };

export default function PolicyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy & Pricing"
        subtitle="The rules and price signals that move the sector — central & state schemes, regulation, ALMM / DCR, and module & cell pricing."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />
      <EmptyState
        icon={ScrollText}
        title="Policy & Pricing — coming soon"
        description="Central & state schemes, regulatory changes, ALMM / DCR status, duties, and module / cell price trends will appear here. Built in a later phase."
      />
    </div>
  );
}
