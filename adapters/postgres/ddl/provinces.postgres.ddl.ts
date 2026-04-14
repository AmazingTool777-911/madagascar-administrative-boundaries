import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { injectPostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the provinces table
 * using PostgreSQL. It leverages the provided ADM configuration to dynamically
 * handle table naming and optional features like geojson.
 */
export class ProvincesPostgresDDL extends BaseAdmTableDDL {
  /** The database connection instance used for executing queries. */
  #db = injectPostgresDbConnection();

  /**
   * Initializes a new instance of ProvincesPostgresDDL.
   *
   * @param config - The runtime ADM configuration to use for the table definitions.
   */
  constructor(config: MadaAdmConfigValues) {
    super(config);
  }

  /**
   * Generates the dynamic table name based on the configuration prefix.
   *
   * @returns The resolved table name.
   */
  get tableName(): string {
    return this.getTableName("provinces");
  }

  /**
   * Creates the provinces physical table in the PostgreSQL database if it does not already exist.
   *
   * @returns A promise that resolves when the table creation is complete.
   */
  async create(): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geometry GEOMETRY(Geometry, 4326),"
      : "";
    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level SMALLINT NOT NULL DEFAULT 0,"
      : "";

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        province VARCHAR(255) NOT NULL,${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    await this.#db.client.queryObject(query);
  }

  /**
   * Drops the provinces physical table from the PostgreSQL database if it exists.
   *
   * @returns A promise that resolves when the table drop is complete.
   */
  async drop(): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${this.tableName};`;
    await this.#db.client.queryObject(query);
  }
}

let _instance: ProvincesPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link ProvincesPostgresDDL}.
 *
 * @param config - The ADM configuration binding.
 * @returns The instance of the provinces table DDL.
 */
export function injectProvincesPostgresDDL(
  config: MadaAdmConfigValues,
): ProvincesPostgresDDL {
  if (!_instance) _instance = new ProvincesPostgresDDL(config);
  return _instance;
}
