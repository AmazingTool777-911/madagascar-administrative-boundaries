import { DbType } from "@scope/consts/db";
import type { DbConnection, MadaAdmConfigDML } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import { injectMadaAdmConfigPostgresDML } from "@scope/adapters/postgres";
import type { PostgresDbConnection } from "@scope/adapters/postgres";
import {
  injectMadaAdmConfigSqliteDML,
  type SqliteDbConnection,
} from "@scope/adapters/sqlite";

/**
 * Injects (or creates) an instance of the mada adm config table DML adapter based on the database type.
 *
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the mada adm config table DML adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectMadaAdmConfigDML(
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): MadaAdmConfigDML {
  switch (dbType) {
    case DbType.Postgres:
      return injectMadaAdmConfigPostgresDML(
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    case DbType.SQLite:
      return injectMadaAdmConfigSqliteDML(
        db as SqliteDbConnection,
      );
    default:
      throw new Error(
        `Unsupported database type for mada adm config DML: ${dbType}`,
      );
  }
}
