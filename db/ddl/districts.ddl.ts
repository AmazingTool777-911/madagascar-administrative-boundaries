import { DbType } from "@scope/consts/db";
import type { DbConnection, TableDDL } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectDistrictsPostgresDDL,
  type PostgresDbConnection,
} from "@scope/adapters/postgres";

/**
 * Injects (or creates) an instance of the districts table DDL adapter based on the database type.
 *
 * @param config - The runtime ADM configuration.
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the districts table DDL adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectDistrictsDDL(
  config: MadaAdmConfigValues,
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): TableDDL {
  switch (dbType) {
    case DbType.Postgres:
      return injectDistrictsPostgresDDL(
        config,
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    default:
      throw new Error(`Unsupported database type for districts DDL: ${dbType}`);
  }
}
