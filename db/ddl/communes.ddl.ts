import { DbType } from "@scope/consts/db";
import type { DbConnection, TableDDL } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectCommunesPostgresDDL,
  type PostgresDbConnection,
  resetCommunesPostgresDDL,
} from "@scope/adapters/postgres";
import {
  injectCommunesSqliteDDL,
  resetCommunesSqliteDDL,
  type SqliteDbConnection,
} from "@scope/adapters/sqlite";

/**
 * Injects (or creates) an instance of the communes table DDL adapter based on the database type.
 *
 * @param config - The runtime ADM configuration.
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the communes table DDL adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectCommunesDDL(
  config: MadaAdmConfigValues,
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): TableDDL {
  switch (dbType) {
    case DbType.Postgres:
      return injectCommunesPostgresDDL(
        config,
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    case DbType.SQLite:
      return injectCommunesSqliteDDL(config, db as SqliteDbConnection);
    default:
      throw new Error(`Unsupported database type for communes DDL: ${dbType}`);
  }
}

/**
 * Resets the instance of the communes table DDL adapter based on the database type.
 *
 * @param dbType - The target database type.
 * @throws {Error} If the database type is unsupported.
 */
export function resetCommunesDDL(dbType: DbType): void {
  switch (dbType) {
    case DbType.Postgres:
      resetCommunesPostgresDDL();
      break;
    case DbType.SQLite:
      resetCommunesSqliteDDL();
      break;
    default:
      throw new Error(
        `Unsupported database type for communes DDL reset: ${dbType}`,
      );
  }
}
