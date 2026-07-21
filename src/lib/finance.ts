/**
 * Small, dependency-free project-finance helpers used by the profit-pools IRR
 * model. Everything here is deterministic (no wall-clock, no RNG) so it is safe
 * to run inside the static data pipeline as well as at render time.
 */

/**
 * Net present value of an upfront CapEx outflow followed by `life` equal annual
 * cash inflows, discounted at rate `r`.
 *   NPV(r) = -capex + Σ_{t=1..life} cash / (1+r)^t
 */
export function npvLevel(capex: number, cash: number, life: number, r: number): number {
  if (r <= -1) return Number.POSITIVE_INFINITY;
  let pv = 0;
  for (let t = 1; t <= life; t++) pv += cash / (1 + r) ** t;
  return pv - capex;
}

/**
 * Pre-tax, unlevered project IRR for the simplest solar-asset cash-flow shape:
 * a single CapEx outflow at t0 and `life` years of a level annual cash flow
 * (EBITDA used as the cash proxy). Returns the IRR as a fraction (0.12 = 12%),
 * or null when it isn't defined/representable:
 *  - cash ≤ 0 (a loss-making stage never returns its capital), or
 *  - the return is so high it exceeds the search ceiling (`rMax`).
 *
 * Solved by bisection — NPV is strictly decreasing in r for positive inflows,
 * so the bracket [rMin, rMax] converges monotonically.
 */
export function projectIrr(
  capex: number,
  annualCash: number,
  life: number,
  { rMin = -0.9, rMax = 3, iterations = 100 }: { rMin?: number; rMax?: number; iterations?: number } = {},
): number | null {
  if (!(capex > 0) || !(annualCash > 0) || !(life > 0)) return null;
  // Undiscounted payback longer than the asset life ⇒ never recovers capital.
  if (annualCash * life <= capex) return null;
  let lo = rMin;
  let hi = rMax;
  const nLo = npvLevel(capex, annualCash, life, lo);
  const nHi = npvLevel(capex, annualCash, life, hi);
  if (nLo < 0) return null; // shouldn't happen given the payback guard
  if (nHi > 0) return null; // IRR above the search ceiling — treat as "off the chart"
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const n = npvLevel(capex, annualCash, life, mid);
    if (n > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Undiscounted payback (years) for a level cash flow, or null if cash ≤ 0. */
export function paybackYears(capex: number, annualCash: number): number | null {
  if (!(capex > 0) || !(annualCash > 0)) return null;
  return capex / annualCash;
}
