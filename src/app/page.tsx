import { ValueChainMap } from "@/components/industry-map/ValueChainMap";

export const dynamic = "force-static";
export const metadata = {
  title: "Industry Map",
  description:
    "India's solar value chain at a glance — click any stage for its market size, profit pool, and the leading companies globally and in India.",
};

export default function IndustryMapPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
      <ValueChainMap />
    </div>
  );
}
