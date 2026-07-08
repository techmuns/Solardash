import { RouteRedirect } from "@/components/layout/RouteRedirect";

export const dynamic = "force-static";
export const metadata = { title: "Capacity & Generation" };

// The Power System section was retired; its surviving demand & peak view now
// lives under Trends. Kept as a redirect so old links survive.
export default function CapacityPage() {
  return <RouteRedirect to="/trends" />;
}
