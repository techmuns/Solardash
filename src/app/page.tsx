import { ValueChainMap } from "@/components/industry-map/ValueChainMap";
import { getStageEconomicsSnapshot } from "@/data";

export const dynamic = "force-static";
export const metadata = {
  title: "Industry Map",
  description:
    "India's solar value chain at a glance — per-stage economics on the chain, plus each stage's market size, profit pool, and leading companies on click.",
};

export default function IndustryMapPage() {
  const economics = getStageEconomicsSnapshot().data.rows;
  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col px-3 py-3 sm:px-4 sm:py-4">
      <ValueChainMap economics={economics} />
    </div>
  );
}
