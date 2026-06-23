/**
 * Data build CLI.
 *
 *   tsx scripts/run.ts <name>              run a single pipeline by name
 *   tsx scripts/run.ts --all               run every pipeline
 *   tsx scripts/run.ts --cadence monthly   run pipelines with that cadence
 */
import type { Cadence } from "../src/data/types/core";
import type { Pipeline } from "./lib/pipeline";
import {
  getPipeline,
  getPipelinesByCadence,
  pipelineNames,
  pipelines,
} from "./lib/registry";

const CADENCES: Cadence[] = ["monthly", "quarterly", "annual", "adhoc"];

function usage(): void {
  console.log(
    [
      "Usage:",
      "  tsx scripts/run.ts <name>            run one pipeline",
      "  tsx scripts/run.ts --all             run all pipelines",
      "  tsx scripts/run.ts --cadence <c>     run pipelines by cadence",
      "",
      `Cadences: ${CADENCES.join(", ")}`,
      `Pipelines: ${pipelineNames().join(", ") || "(none)"}`,
    ].join("\n"),
  );
}

async function runOne(p: Pipeline): Promise<void> {
  const start = Date.now();
  process.stdout.write(`▶ ${p.name} (${p.section} · ${p.cadence}) … `);
  await p.run();
  console.log(`done in ${Date.now() - start}ms`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let toRun: Pipeline[];

  if (args.includes("--all")) {
    toRun = pipelines;
  } else {
    const cadenceIdx = args.indexOf("--cadence");
    if (cadenceIdx !== -1) {
      const cadence = args[cadenceIdx + 1] as Cadence | undefined;
      if (!cadence || !CADENCES.includes(cadence)) {
        console.error(`Invalid or missing cadence. Expected one of: ${CADENCES.join(", ")}`);
        process.exit(1);
      }
      toRun = getPipelinesByCadence(cadence);
    } else {
      const name = args.find((a) => !a.startsWith("--"));
      if (!name) {
        usage();
        process.exit(1);
      }
      const pipeline = getPipeline(name);
      if (!pipeline) {
        console.error(`Unknown pipeline: "${name}"`);
        usage();
        process.exit(1);
      }
      toRun = [pipeline];
    }
  }

  if (toRun.length === 0) {
    console.warn("No pipelines matched — nothing to build.");
    return;
  }

  for (const p of toRun) {
    await runOne(p);
  }
  console.log(`✓ ${toRun.length} pipeline(s) complete.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
