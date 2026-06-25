import { RouteRedirect } from "@/components/layout/RouteRedirect";

export const dynamic = "force-static";
export const metadata = { title: "Capacity & Generation" };

// Merged into Power System (Phase 2). Kept as a redirect so old links survive.
export default function CapacityPage() {
  return <RouteRedirect to="/power-system" />;
}
