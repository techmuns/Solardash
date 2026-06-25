import { RouteRedirect } from "@/components/layout/RouteRedirect";

export const dynamic = "force-static";
export const metadata = { title: "Power Demand" };

// Merged into Power System (Phase 2). Kept as a redirect so old links survive.
export default function DemandPage() {
  return <RouteRedirect to="/power-system" />;
}
