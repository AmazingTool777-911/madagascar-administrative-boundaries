import { DbType } from "@scope/consts/db";
import type { DbConnection, TableDDL } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectDistrictsPostgresDDL,
  type PostgresDbConnection,
  resetDistrictsPostgresDDL,
} from "@scope/adapters/postgres";
import {
  injectDistrictsSqliteDDL,
  resetDistrictsSqliteDDL,
  type SqliteDbConnection,
} from "@scope/adapters/sqlite";

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
    case DbType.SQLite:
      return injectDistrictsSqliteDDL(config, db as SqliteDbConnection);
    default:
      throw new Error(`Unsupported database type for districts DDL: ${dbType}`);
  }
}

/**
 * Resets the instance of the districts table DDL adapter based on the database type.
 *
 * @param dbType - The target database type.
 * @throws {Error} If the database type is unsupported.
 */
export function resetDistrictsDDL(dbType: DbType): void {
  switch (dbType) {
    case DbType.Postgres:
      resetDistrictsPostgresDDL();
      break;
    case DbType.SQLite:
      resetDistrictsSqliteDDL();
      break;
    default:
      throw new Error(
        `Unsupported database type for districts DDL reset: ${dbType}`,
      );
  }
}
