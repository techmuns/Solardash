"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side redirect stub for a statically-exported route — keeps an old deep
 * link alive (prerenders a real HTML page that immediately replaces the URL).
 * Used for /capacity and /demand → /trends after the Power System section was
 * retired (its demand & peak view moved under Trends).
 */
export function RouteRedirect({ to }: { to: string }) {
  const router = useRouter();
  React.useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <div className="p-6 text-sm text-muted-foreground">Redirecting…</div>
  );
}
