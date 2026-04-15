import type { PostgresConnectionParams } from "@scope/types/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { AdmLevelCode } from "@scope/consts/models";

/**
 * Shared context for the ADM input extraction job.
 * This context is persisted across job stages to allow for resuming and consistency.
 */
export type ExtractAdmInputJobContext = {
  /** The runtime ADM configuration values. */
  config: MadaAdmConfigValues;
  /** The PostgreSQL connection parameters used for this job. */
  pgConnection: PostgresConnectionParams["connection"];
  /** The current administrative level being processed. */
  currentAdmLevel: AdmLevelCode;
};
