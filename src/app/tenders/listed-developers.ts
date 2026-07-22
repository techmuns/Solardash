/**
 * Auction-winning developers mapped to the listed Indian entity behind them.
 * The auction feed names the bidding SPV/subsidiary (e.g. "NLC India Renewables",
 * "JSW Neo"), which hides that a listed parent (NLC India, JSW Energy) is the
 * real owner. This map lets the leaderboard show the listed parent alongside the
 * bidding entity so subsidiaries aren't read as standalone companies.
 *
 * Conservative on purpose: only names we can confidently attribute to a listed
 * Indian entity are included. Private SPVs (Serentica, Shivalaya, SAEL, AMPIN,
 * Hexa, Vena, Welspun New Energy…), foreign-listed sponsors (Engie, Sembcorp,
 * Gentari) and ambiguous names are treated as unlisted. Extend as coverage firms.
 */
export interface ListedInfo {
  /** Display name of the LISTED company behind this bidder. */
  parent: string;
  /** NSE/BSE ticker of the listed parent. */
  ticker: string;
  /** True when the bidder is a subsidiary/SPV, not the listed entity itself. */
  subsidiary?: boolean;
}

export const DEVELOPER_LISTING: Record<string, ListedInfo> = {
  // Directly listed bidders.
  "NLC India": { parent: "NLC India", ticker: "NLCINDIA" },
  "ACME Solar": { parent: "ACME Solar Holdings", ticker: "ACMESOLAR" },
  "Waaree Renewable": { parent: "Waaree Renewable", ticker: "WAAREERTL" },
  "KP Energy": { parent: "KP Energy", ticker: "KPEL" },
  "Oriana Power": { parent: "Oriana Power", ticker: "ORIANA" },
  "Coal India": { parent: "Coal India", ticker: "COALINDIA" },
  BPCL: { parent: "Bharat Petroleum", ticker: "BPCL" },
  // Subsidiaries / SPVs of a listed parent.
  "NLC India Renewables": { parent: "NLC India", ticker: "NLCINDIA", subsidiary: true },
  "NTPC REL": { parent: "NTPC", ticker: "NTPC", subsidiary: true },
  "JSW Neo": { parent: "JSW Energy", ticker: "JSWENERGY", subsidiary: true },
  "Torrent Green": { parent: "Torrent Power", ticker: "TORNTPOWER", subsidiary: true },
  "Purvah Green": { parent: "CESC", ticker: "CESC", subsidiary: true },
  "Purvah Green Power": { parent: "CESC", ticker: "CESC", subsidiary: true },
};

/** Back-compat: name → ticker (used by the listed-only filter). */
export const LISTED_DEVELOPERS: Record<string, string> = Object.fromEntries(
  Object.entries(DEVELOPER_LISTING).map(([name, info]) => [name, info.ticker]),
);

/** True when a developer (by exact leaderboard name) maps to a listed entity. */
export function isListedDeveloper(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEVELOPER_LISTING, name);
}

/** Listed-entity info for a bidder, or undefined when unlisted. */
export function listedInfo(name: string): ListedInfo | undefined {
  return DEVELOPER_LISTING[name];
}
