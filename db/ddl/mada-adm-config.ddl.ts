import { DbType } from "@scope/consts/db";
import type { DbConnection, TableDDL } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import {
  injectMadaAdmConfigPostgresDDL,
  type PostgresDbConnection,
  resetMadaAdmConfigPostgresDDL,
} from "@scope/adapters/postgres";

/**
 * Injects (or creates) an instance of the mada adm config table DDL adapter based on the database type.
 *
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the mada adm config table DDL adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectMadaAdmConfigDDL(
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): TableDDL {
  switch (dbType) {
    case DbType.Postgres:
      return injectMadaAdmConfigPostgresDDL(
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    default:
      throw new Error(
        `Unsupported database type for mada adm config DDL: ${dbType}`,
      );
  }
}

/**
 * Resets the instance of the mada adm config table DDL adapter based on the database type.
 *
 * @param dbType - The target database type.
 * @throws {Error} If the database type is unsupported.
 */
export function resetMadaAdmConfigDDL(dbType: DbType): void {
  switch (dbType) {
    case DbType.Postgres:
      resetMadaAdmConfigPostgresDDL();
      break;
    default:
      throw new Error(
        `Unsupported database type for mada adm config DDL reset: ${dbType}`,
      );
  }
}
