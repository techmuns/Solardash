import { ValueChainMap } from "@/components/industry-map/ValueChainMap";

export const dynamic = "force-static";
export const metadata = {
  title: "Industry Map",
  description:
    "India's solar value chain at a glance — click any stage for its market size, profit pool, and the leading companies globally and in India.",
};

export default function IndustryMapPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col px-3 py-3 sm:px-4 sm:py-4">
      <ValueChainMap />
    </div>
  );
}
