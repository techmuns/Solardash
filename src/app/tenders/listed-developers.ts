/**
 * Auction-winning developers that trade publicly on an Indian exchange (NSE/BSE),
 * mapped to their ticker. Curated — the auction feed has no listing field.
 *
 * Conservative on purpose: only names we can confidently attribute to a listed
 * Indian entity are included. Private SPVs (Serentica, Shivalaya, Purvah Green,
 * SAEL, AMPIN, Hexa, …), foreign-listed sponsors (Engie, Sembcorp, Vena), and
 * ambiguous names are treated as unlisted. Extend as coverage firms up.
 */
export const LISTED_DEVELOPERS: Record<string, string> = {
  "NLC India": "NLCINDIA",
  "ACME Solar": "ACMESOLAR",
  "Waaree Renewable": "WAAREERTL",
  "KP Energy": "KPEL",
  "Oriana Power": "ORIANA",
};

/** True when a developer (by exact leaderboard name) is a listed Indian company. */
export function isListedDeveloper(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(LISTED_DEVELOPERS, name);
}
