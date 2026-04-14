import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { injectPostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the regions table
 * using PostgreSQL.
 */
export class RegionsPostgresDDL extends BaseAdmTableDDL {
  #db = injectPostgresDbConnection();

  constructor(config: MadaAdmConfigValues) {
    super(config);
  }

  get tableName(): string {
    return this.getTableName("regions");
  }

  async create(): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geometry GEOMETRY(Geometry, 4326),"
      : "";
    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level SMALLINT NOT NULL DEFAULT 1,"
      : "";
    const provincesTable = this.getTableName("provinces");

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        region VARCHAR(255) NOT NULL,
        province VARCHAR(255) NOT NULL,
        province_id INTEGER NOT NULL,${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_region_province FOREIGN KEY (province_id) REFERENCES ${provincesTable}(id) ON DELETE CASCADE
      );
    `;
    await this.#db.client.queryObject(query);
  }

  async drop(): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${this.tableName};`;
    await this.#db.client.queryObject(query);
  }
}

let _instance: RegionsPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link RegionsPostgresDDL}.
 */
export function injectRegionsPostgresDDL(
  config: MadaAdmConfigValues,
): RegionsPostgresDDL {
  if (!_instance) _instance = new RegionsPostgresDDL(config);
  return _instance;
}
