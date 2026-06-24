import {
  getDevelopersSnapshot,
  getTendersSnapshot,
  getWhatsNewSnapshot,
} from "@/data";
import { TENDER_TYPE_LABELS } from "@/lib/tender-types";
import { fyQuarter } from "@/lib/fiscal";
import type { WhatsNewEvent } from "@/data/types/whats-new";

const MAX_TENDERS = 10;
const MAX_PPAS = 10;

/**
 * Aggregate a chronological activity feed from the committed snapshots: curated
 * milestones + recent auction awards + recent PPA signings. Every event carries
 * a real date; `period` is the derived FY-quarter. Sorted newest-first with a
 * stable id tiebreak, so the build is deterministic.
 */
export function getWhatsNewFeed(): WhatsNewEvent[] {
  const events: WhatsNewEvent[] = [];

  // --- Curated milestones ---
  getWhatsNewSnapshot().data.milestones.forEach((m, i) => {
    events.push({
      id: `milestone:${i}`,
      date: m.date,
      period: fyQuarter(m.date),
      category: m.category,
      title: m.title,
      detail: m.detail,
      href: m.href,
      ...(m.sourceUrl ? { sourceUrl: m.sourceUrl } : {}),
    });
  });

  // --- Auction awards (top ~10 most-recent) ---
  for (const a of getTendersSnapshot().data.recentAwards.slice(0, MAX_TENDERS)) {
    const typeLabel = TENDER_TYPE_LABELS[a.tenderType] ?? a.tenderType;
    const parts = [
      a.tariffRs != null ? `₹${a.tariffRs}/unit` : null,
      a.winners?.[0]?.developer ?? null,
    ].filter(Boolean);
    events.push({
      id: `tender:${a.id}`,
      date: a.date,
      period: fyQuarter(a.date),
      category: "tender",
      title: `${a.agency} awards ${a.capacityMw} MW ${typeLabel}`,
      detail: parts.join(" · ") || a.status,
      href: "/tenders",
      ...(a.sourceUrl ? { sourceUrl: a.sourceUrl } : {}),
    });
  }

  // --- PPA / PSA signings (top ~10 most-recent) ---
  for (const p of getDevelopersSnapshot().data.ppaTracker.slice(0, MAX_PPAS)) {
    const typeLabel = TENDER_TYPE_LABELS[p.tenderType] ?? p.tenderType;
    events.push({
      id: `ppa:${p.id}`,
      date: p.date,
      period: fyQuarter(p.date),
      category: "ppa",
      title: `${p.developer} signs ${p.capacityMw} MW ${typeLabel} PPA`,
      detail: `${p.agency}${p.tariffRs != null ? ` · ₹${p.tariffRs}/unit` : ""}`,
      href: "/developers",
      ...(p.sourceUrl ? { sourceUrl: p.sourceUrl } : {}),
    });
  }

  return events.sort(
    (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
  );
}
