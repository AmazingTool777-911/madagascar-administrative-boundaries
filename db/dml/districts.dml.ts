import { DbType } from "@scope/consts/db";
import type { DbConnection, DistrictTableDML } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectDistrictsPostgresDML,
  type PostgresDbConnection,
} from "@scope/adapters/postgres";

import {
  injectDistrictsSqliteDML,
  type SqliteDbConnection,
} from "@scope/adapters/sqlite";

/**
 * Injects (or creates) an instance of the districts table DML adapter based on the database type.
 *
 * @param config - The runtime ADM configuration.
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the districts table DML adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectDistrictsDML(
  config: MadaAdmConfigValues,
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): DistrictTableDML {
  switch (dbType) {
    case DbType.Postgres:
      return injectDistrictsPostgresDML(
        config,
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    case DbType.SQLite:
      return injectDistrictsSqliteDML(
        config,
        db as SqliteDbConnection,
      );
    default:
      throw new Error(
        `Unsupported database type for districts DML: ${dbType}`,
      );
  }
}
