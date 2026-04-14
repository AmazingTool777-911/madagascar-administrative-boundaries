import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { injectPostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the districts table
 * using PostgreSQL.
 */
export class DistrictsPostgresDDL extends BaseAdmTableDDL {
  #db = injectPostgresDbConnection();

  constructor(config: MadaAdmConfigValues) {
    super(config);
  }

  get tableName(): string {
    return this.getTableName("districts");
  }

  async create(): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geometry GEOMETRY(Geometry, 4326),"
      : "";
    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level SMALLINT NOT NULL DEFAULT 2,"
      : "";

    let optionalCols = "";
    let optionalFk = "";

    if (this.config.isProvinceRepeated) {
      optionalCols += "\n        province VARCHAR(255) NOT NULL,";
    }
    if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
      optionalCols += "\n        province_id INTEGER NOT NULL,";
      const provincesTable = this.getTableName("provinces");
      optionalFk +=
        `,\n        CONSTRAINT fk_district_province FOREIGN KEY (province_id) REFERENCES ${provincesTable}(id) ON DELETE CASCADE`;
    }

    const regionsTable = this.getTableName("regions");

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        district VARCHAR(255) NOT NULL,
        region VARCHAR(255) NOT NULL,
        region_id INTEGER NOT NULL,${optionalCols}${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_district_region FOREIGN KEY (region_id) REFERENCES ${regionsTable}(id) ON DELETE CASCADE${optionalFk}
      );
    `;
    await this.#db.client.queryObject(query);
  }

  async drop(): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${this.tableName};`;
    await this.#db.client.queryObject(query);
  }
}

let _instance: DistrictsPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link DistrictsPostgresDDL}.
 */
export function injectDistrictsPostgresDDL(
  config: MadaAdmConfigValues,
): DistrictsPostgresDDL {
  if (!_instance) _instance = new DistrictsPostgresDDL(config);
  return _instance;
}
