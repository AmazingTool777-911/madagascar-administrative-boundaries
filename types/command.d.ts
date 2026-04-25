import type { AdmLevelCode } from "@scope/consts/models";
import type { DbConnectionParams } from "./db.d.ts";
import type { MadaAdmConfigValues } from "./models.d.ts";
import type { DbDDLExtraOptionsCliConfig } from "./cli.d.ts";

/**
 * Shared job context for the ADM seeding pipeline.
 * Persisted across job stages to allow for resuming and consistency.
 */
export interface SeedAdmJobContext {
  /** The runtime ADM configuration values. */
  config: MadaAdmConfigValues;
  /** The database connection parameters used for this job. */
  dbConnectionParams: DbConnectionParams;
  /** The current administrative level being processed. */
  currentAdmLevel: AdmLevelCode;
  /** The unique timestamp (milliseconds) identifying this job session. */
  jobTimestamp: number;
  /** Extra options from the CLI for DDLs */
  ddlExtraOptions: DbDDLExtraOptionsCliConfig;
}
