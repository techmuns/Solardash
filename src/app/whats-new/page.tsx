import { PageHeader } from "@/components/ui/PageHeader";
import { getWhatsNewFeed } from "@/data/whats-new";
import { formatDate } from "@/lib/utils";
import { WhatsNewFeed } from "./WhatsNewFeed";

export const dynamic = "force-static";
export const metadata = {
  title: "What's New",
  description:
    "A chronological activity feed across India's solar sector — auction awards, PPA signings, company results, capacity records, and policy.",
};

export default function WhatsNewPage() {
  const events = getWhatsNewFeed();
  const latest = events[0]?.date;

  return (
    <div className="space-y-8">
      <PageHeader
        title="What's New"
        subtitle="Recent activity across India's solar sector — auctions, signings, results, and records."
        asOf={latest ? `Updated ${formatDate(latest)}` : undefined}
      />
      <WhatsNewFeed events={events} />
    </div>
  );
}
