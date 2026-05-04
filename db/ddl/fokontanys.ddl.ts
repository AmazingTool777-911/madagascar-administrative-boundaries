import { DbType } from "@scope/consts/db";
import type { DbConnection, TableDDL } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectFokontanysPostgresDDL,
  type PostgresDbConnection,
  resetFokontanysPostgresDDL,
} from "@scope/adapters/postgres";
import {
  injectFokontanysSqliteDDL,
  resetFokontanysSqliteDDL,
  type SqliteDbConnection,
} from "@scope/adapters/sqlite";

/**
 * Injects (or creates) an instance of the fokontanys table DDL adapter based on the database type.
 *
 * @param config - The runtime ADM configuration.
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the fokontanys table DDL adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectFokontanysDDL(
  config: MadaAdmConfigValues,
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): TableDDL {
  switch (dbType) {
    case DbType.Postgres:
      return injectFokontanysPostgresDDL(
        config,
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    case DbType.SQLite:
      return injectFokontanysSqliteDDL(config, db as SqliteDbConnection);
    default:
      throw new Error(
        `Unsupported database type for fokontanys DDL: ${dbType}`,
      );
  }
}

/**
 * Resets the instance of the fokontanys table DDL adapter based on the database type.
 *
 * @param dbType - The target database type.
 * @throws {Error} If the database type is unsupported.
 */
export function resetFokontanysDDL(dbType: DbType): void {
  switch (dbType) {
    case DbType.Postgres:
      resetFokontanysPostgresDDL();
      break;
    case DbType.SQLite:
      resetFokontanysSqliteDDL();
      break;
    default:
      throw new Error(
        `Unsupported database type for fokontanys DDL reset: ${dbType}`,
      );
  }
}
