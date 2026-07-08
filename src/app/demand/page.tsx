import { RouteRedirect } from "@/components/layout/RouteRedirect";

export const dynamic = "force-static";
export const metadata = { title: "Power Demand" };

// The Power System section was retired; the demand & peak view now lives under
// Trends. Kept as a redirect so old links survive.
export default function DemandPage() {
  return <RouteRedirect to="/trends" />;
}
