/** The kind of activity an event represents (drives its icon, badge, filter). */
export type WhatsNewCategory =
  | "tender"
  | "ppa"
  | "company"
  | "developer"
  | "capacity"
  | "manufacturing"
  | "demand"
  | "policy";

/** A single dated activity-feed event (aggregated from snapshots + milestones). */
export interface WhatsNewEvent {
  id: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** FY-quarter label, e.g. `Q4FY26` (derived from `date`). */
  period: string;
  category: WhatsNewCategory;
  title: string;
  detail: string;
  href: string;
  sourceUrl?: string;
}

/** One curated milestone row (the `whats-new/milestones` snapshot payload). */
export interface Milestone {
  date: string;
  category: WhatsNewCategory;
  title: string;
  detail: string;
  href: string;
  sourceUrl?: string;
}

/** Payload of the `whats-new/milestones` snapshot. */
export interface WhatsNewData {
  milestones: Milestone[];
}
