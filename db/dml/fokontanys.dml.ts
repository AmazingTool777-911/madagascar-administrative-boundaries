import { DbType } from "@scope/consts/db";
import type { DbConnection, FokontanyTableDML } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectFokontanysPostgresDML,
  type PostgresDbConnection,
} from "@scope/adapters/postgres";

import {
  injectFokontanysSqliteDML,
  type SqliteDbConnection,
} from "@scope/adapters/sqlite";

/**
 * Injects (or creates) an instance of the fokontanys table DML adapter based on the database type.
 *
 * @param config - The runtime ADM configuration.
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the fokontanys table DML adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectFokontanysDML(
  config: MadaAdmConfigValues,
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): FokontanyTableDML {
  switch (dbType) {
    case DbType.Postgres:
      return injectFokontanysPostgresDML(
        config,
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    case DbType.SQLite:
      return injectFokontanysSqliteDML(
        config,
        db as SqliteDbConnection,
      );
    default:
      throw new Error(
        `Unsupported database type for fokontanys DML: ${dbType}`,
      );
  }
}
