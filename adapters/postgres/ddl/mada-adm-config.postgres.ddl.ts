import { injectPostgresDbConnection } from "../postgres-db.connection.ts";
import type { TableDDL } from "@scope/types/db";

/**
 * Concrete implementation of the DDL abstract class for the Mada ADM configuration table
 * using PostgreSQL. It manages the `mada_adm_config` table schema.
 */
export class MadaAdmConfigPostgresDDL implements TableDDL {
  /** The database connection instance used for executing queries. */
  #db = injectPostgresDbConnection();

  /** The physical database table name. */
  static readonly TABLE_NAME = "mada_adm_config";

  /**
   * Gets the physical database table name.
   */
  get tableName(): string {
    return MadaAdmConfigPostgresDDL.TABLE_NAME;
  }

  /**
   * Creates the `mada_adm_config` physical table in the PostgreSQL database if it does not already exist.
   *
   * @returns A promise that resolves when the table creation is complete.
   */
  async create(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${MadaAdmConfigPostgresDDL.TABLE_NAME} (
        id SERIAL PRIMARY KEY,
        tables_prefix VARCHAR(50),
        is_fk_repeated BOOLEAN NOT NULL DEFAULT TRUE,
        is_province_repeated BOOLEAN NOT NULL DEFAULT FALSE,
        is_province_fk_repeated BOOLEAN NOT NULL DEFAULT FALSE,
        has_geojson BOOLEAN NOT NULL DEFAULT FALSE,
        has_adm_level BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    await this.#db.client.queryObject(query);
  }

  /**
   * Drops the `mada_adm_config` physical table from the PostgreSQL database if it exists.
   *
   * @returns A promise that resolves when the table drop is complete.
   */
  async drop(): Promise<void> {
    const query =
      `DROP TABLE IF EXISTS ${MadaAdmConfigPostgresDDL.TABLE_NAME};`;
    await this.#db.client.queryObject(query);
  }
}

let _instance: MadaAdmConfigPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link MadaAdmConfigPostgresDDL}.
 *
 * @returns The instance of the Mada ADM config table DDL.
 */
export function injectMadaAdmConfigPostgresDDL(): MadaAdmConfigPostgresDDL {
  if (!_instance) _instance = new MadaAdmConfigPostgresDDL();
  return _instance;
}
