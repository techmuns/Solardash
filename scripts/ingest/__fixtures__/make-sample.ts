/**
 * Build a synthetic Screener-shaped "Data Sheet" workbook with known values, so
 * the parser can be validated fully offline (Screener blocks our build IP).
 *
 * Run directly to emit `sample.xlsx` for manual `--file` testing:
 *   tsx scripts/ingest/__fixtures__/make-sample.ts
 */
import { basename, join } from "node:path";
import * as XLSX from "xlsx";

type Cell = string | number;

/** The values baked into the fixture — the single source of truth for the test. */
export const SAMPLE_EXPECT = {
  annual: [
    { period: "FY24", revenue: 1000, ebitda: 150, ebitdaMarginPct: 15, pat: 90, epsRs: 9, rocePct: 12 },
    { period: "FY25", revenue: 1500, ebitda: 240, ebitdaMarginPct: 16, pat: 160, epsRs: 16, rocePct: 14 },
    { period: "FY26", revenue: 2200, ebitda: 396, ebitdaMarginPct: 18, pat: 280, epsRs: 28, rocePct: 16 },
  ],
  quarterly: [
    { period: "Q3FY26", revenue: 550, ebitda: 99, ebitdaMarginPct: 18, pat: 70, patMarginPct: 12.73 },
    { period: "Q4FY26", revenue: 620, ebitda: 124, ebitdaMarginPct: 20, pat: 88, patMarginPct: 14.19 },
  ],
  rocePct: 16,
  asOf: "2026-03-31",
} as const;

/** Screener "Data Sheet" layout: section headers + a Report Date row + metric
 *  rows in column A, periods across the columns. */
function sampleAoa(): Cell[][] {
  return [
    ["Sample Solar Ltd"],
    [],
    ["PROFIT & LOSS"],
    ["Report Date", "Mar-2024", "Mar-2025", "Mar-2026"],
    ["Sales", 1000, 1500, 2200],
    ["Expenses", 850, 1260, 1804],
    ["Operating Profit", 150, 240, 396],
    ["OPM", 15, 16, 18],
    ["Other Income", 5, 6, 7],
    ["Depreciation", 20, 25, 30],
    ["Interest", 10, 12, 14],
    ["Profit before tax", 125, 209, 359],
    ["Tax", 35, 49, 79],
    ["Net profit", 90, 160, 280],
    ["EPS", 9, 16, 28],
    ["Dividend Payout", 0, 10, 12],
    [],
    ["Quarters"],
    ["Report Date", "Dec-2025", "Mar-2026"],
    ["Sales", 550, 620],
    ["Expenses", 451, 496],
    ["Operating Profit", 99, 124],
    ["OPM", 18, 20],
    ["Net profit", 70, 88],
    ["EPS", 7, 9],
    [],
    ["BALANCE SHEET"],
    ["Report Date", "Mar-2024", "Mar-2025", "Mar-2026"],
    ["Equity Share Capital", 100, 100, 100],
    ["Reserves", 500, 660, 940],
    ["Borrowings", 300, 280, 250],
    ["Other Liabilities", 200, 210, 220],
    [],
    ["DERIVED:"],
    ["Report Date", "Mar-2024", "Mar-2025", "Mar-2026"],
    ["Return on Equity", 14, 16, 18],
    ["Return on Capital Employed", 12, 14, 16],
  ];
}

/** A workbook with a single "Data Sheet" tab built from {@link sampleAoa}. */
export function buildSampleWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleAoa());
  XLSX.utils.book_append_sheet(wb, ws, "Data Sheet");
  return wb;
}

// Run directly → write sample.xlsx into this fixtures dir (for manual --file use).
if (basename(process.argv[1] ?? "") === "make-sample.ts") {
  const out = join(process.cwd(), "scripts", "ingest", "__fixtures__", "sample.xlsx");
  XLSX.writeFile(buildSampleWorkbook(), out);
  console.log(`wrote ${out}`);
}
