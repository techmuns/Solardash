"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { formatDate } from "@/lib/utils";
import { formatFyQuarter } from "@/lib/fiscal";
import type { WhatsNewEvent } from "@/data/types/whats-new";
import { CATEGORY_META } from "./category-meta";

// The filter tabs (a subset of categories, per spec).
const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tender", label: "Tenders" },
  { value: "ppa", label: "PPAs" },
  { value: "company", label: "Companies" },
  { value: "developer", label: "IPPs" },
  { value: "capacity", label: "Capacity" },
  { value: "manufacturing", label: "Manufacturing" },
];

function groupByPeriod(events: WhatsNewEvent[]) {
  const groups: { period: string; items: WhatsNewEvent[] }[] = [];
  for (const e of events) {
    const last = groups[groups.length - 1];
    if (last && last.period === e.period) last.items.push(e);
    else groups.push({ period: e.period, items: [e] });
  }
  return groups;
}

function EventRow({ event }: { event: WhatsNewEvent }) {
  const meta = CATEGORY_META[event.category];
  const Icon = meta.icon;
  return (
    <li className="flex gap-3.5 rounded-lg border border-border bg-card p-4 transition-colors hover:border-brand/30">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${meta.color}1a`, color: meta.color }}
        aria-hidden
      >
        <Icon className="h-[1.1rem] w-[1.1rem]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={event.href}
            className="font-medium text-foreground hover:text-brand"
          >
            {event.title}
          </Link>
          <Badge variant="outline" className="shrink-0">
            {meta.label}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{event.detail}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <time dateTime={event.date}>{formatDate(event.date)}</time>
          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline-offset-2 hover:text-brand hover:underline"
            >
              Source
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

export function WhatsNewFeed({ events }: { events: WhatsNewEvent[] }) {
  const [filter, setFilter] = React.useState("all");

  const filtered =
    filter === "all" ? events : events.filter((e) => e.category === filter);
  const groups = groupByPeriod(filtered);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No activity in this category yet.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.period} className="space-y-3">
              <h2 className="sticky top-topbar z-10 -mx-1 bg-background/80 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                {formatFyQuarter(group.period)}
              </h2>
              <ul className="space-y-2.5">
                {group.items.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
