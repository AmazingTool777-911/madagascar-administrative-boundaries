import { DbType } from "@scope/consts/db";
import type { DbConnection, TableDDL } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectProvincesPostgresDDL,
  type PostgresDbConnection,
  resetProvincesPostgresDDL,
} from "@scope/adapters/postgres";
import {
  injectProvincesSqliteDDL,
  resetProvincesSqliteDDL,
  type SqliteDbConnection,
} from "@scope/adapters/sqlite";

/**
 * Injects (or creates) an instance of the provinces table DDL adapter based on the database type.
 *
 * @param config - The runtime ADM configuration.
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the provinces table DDL adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectProvincesDDL(
  config: MadaAdmConfigValues,
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): TableDDL {
  switch (dbType) {
    case DbType.Postgres:
      return injectProvincesPostgresDDL(
        config,
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    case DbType.SQLite:
      return injectProvincesSqliteDDL(config, db as SqliteDbConnection);
    default:
      throw new Error(`Unsupported database type for provinces DDL: ${dbType}`);
  }
}

/**
 * Resets the instance of the provinces table DDL adapter based on the database type.
 *
 * @param dbType - The target database type.
 * @throws {Error} If the database type is unsupported.
 */
export function resetProvincesDDL(dbType: DbType): void {
  switch (dbType) {
    case DbType.Postgres:
      resetProvincesPostgresDDL();
      break;
    case DbType.SQLite:
      resetProvincesSqliteDDL();
      break;
    default:
      throw new Error(
        `Unsupported database type for provinces DDL reset: ${dbType}`,
      );
  }
}
