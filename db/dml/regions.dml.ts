import { DbType } from "@scope/consts/db";
import type { DbConnection, RegionTableDML } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectRegionsPostgresDML,
  type PostgresDbConnection,
} from "@scope/adapters/postgres";

/**
 * Injects (or creates) an instance of the regions table DML adapter based on the database type.
 *
 * @param config - The runtime ADM configuration.
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the regions table DML adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectRegionsDML(
  config: MadaAdmConfigValues,
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): RegionTableDML {
  switch (dbType) {
    case DbType.Postgres:
      return injectRegionsPostgresDML(
        config,
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    default:
      throw new Error(
        `Unsupported database type for regions DML: ${dbType}`,
      );
  }
}
