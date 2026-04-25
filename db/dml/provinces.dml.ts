import { DbType } from "@scope/consts/db";
import type { DbConnection, ProvinceTableDML } from "@scope/types/db";
import type { DbDDLExtraOptionsCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import {
  injectProvincesPostgresDML,
  type PostgresDbConnection,
} from "@scope/adapters/postgres";

/**
 * Injects (or creates) an instance of the provinces table DML adapter based on the database type.
 *
 * @param config - The runtime ADM configuration.
 * @param dbType - The target database type.
 * @param db - The active database connection.
 * @param options - Extra CLI configuration options including schema.
 * @returns The instance of the provinces table DML adapter.
 * @throws {Error} If the database type is unsupported.
 */
export function injectProvincesDML(
  config: MadaAdmConfigValues,
  dbType: DbType,
  db: DbConnection,
  options?: DbDDLExtraOptionsCliConfig,
): ProvinceTableDML {
  switch (dbType) {
    case DbType.Postgres:
      return injectProvincesPostgresDML(
        config,
        db as PostgresDbConnection,
        options?.pgSchema,
      );
    default:
      throw new Error(
        `Unsupported database type for provinces DML: ${dbType}`,
      );
  }
}
