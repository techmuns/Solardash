import Link from "next/link";
import { Compass } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Page not found"
        subtitle="That route doesn't exist in the terminal."
      />
      <EmptyState
        icon={Compass}
        title="404 — nothing here"
        description="The page you were looking for may have moved or doesn't exist yet."
        action={
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-brand-dark"
          >
            Back to Overview
          </Link>
        }
      />
    </div>
  );
}
