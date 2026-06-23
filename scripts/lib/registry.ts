import type { Cadence } from "../../src/data/types/core";
import type { Pipeline } from "./pipeline";
import { overviewPipeline } from "../pipelines/overview";
import { tendersPipeline } from "../pipelines/tenders";
import { developersPipeline } from "../pipelines/developers";
import { manufacturingPipeline } from "../pipelines/manufacturing";
import { capacityPipeline } from "../pipelines/capacity";
import { demandPipeline } from "../pipelines/demand";
import { companiesPipeline } from "../pipelines/companies";
import { policyPipeline } from "../pipelines/policy";
import { referencePipeline } from "../pipelines/reference";

/** Every registered pipeline. New section pipelines are added here. */
export const pipelines: Pipeline[] = [
  overviewPipeline,
  tendersPipeline,
  developersPipeline,
  manufacturingPipeline,
  capacityPipeline,
  demandPipeline,
  companiesPipeline,
  policyPipeline,
  referencePipeline,
];

export function getPipeline(name: string): Pipeline | undefined {
  return pipelines.find((p) => p.name === name);
}

export function getPipelinesByCadence(cadence: Cadence): Pipeline[] {
  return pipelines.filter((p) => p.cadence === cadence);
}

export function pipelineNames(): string[] {
  return pipelines.map((p) => p.name);
}
