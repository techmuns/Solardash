import { LineChart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-static";
export const metadata = { title: "Listed Companies" };

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Listed Companies"
        subtitle="A financial screener and per-stock pages for listed solar & renewable plays across developers, manufacturers, and EPC."
        asOf={<Badge variant="outline">No data yet</Badge>}
      />
      <EmptyState
        icon={LineChart}
        title="Listed Companies — coming soon"
        description="A sortable screener of listed solar & renewable companies, plus per-company pages with financials and segment exposure, will appear here. Built in a later phase."
      />
    </div>
  );
}
