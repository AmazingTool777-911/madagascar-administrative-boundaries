import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { injectPostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the communes table
 * using PostgreSQL.
 */
export class CommunesPostgresDDL extends BaseAdmTableDDL {
  #db = injectPostgresDbConnection();

  constructor(config: MadaAdmConfigValues) {
    super(config);
  }

  get tableName(): string {
    return this.getTableName("communes");
  }

  async create(): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geometry GEOMETRY(Geometry, 4326),"
      : "";
    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level SMALLINT NOT NULL DEFAULT 3,"
      : "";

    const regionsTable = this.getTableName("regions");
    const provincesTable = this.getTableName("provinces");
    const districtsTable = this.getTableName("districts");

    let optionalCols = "";
    let optionalFk = "";

    if (this.config.isProvinceRepeated) {
      optionalCols += "\n        province VARCHAR(255) NOT NULL,";
    }
    if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
      optionalCols += "\n        province_id INTEGER NOT NULL,";
      optionalFk +=
        `,\n        CONSTRAINT fk_commune_province FOREIGN KEY (province_id) REFERENCES ${provincesTable}(id) ON DELETE CASCADE`;
    }
    if (this.config.isFkRepeated) {
      optionalCols += "\n        region_id INTEGER NOT NULL,";
      optionalFk +=
        `,\n        CONSTRAINT fk_commune_region FOREIGN KEY (region_id) REFERENCES ${regionsTable}(id) ON DELETE CASCADE`;
    }

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        commune VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        region VARCHAR(255) NOT NULL,
        district_id INTEGER NOT NULL,${optionalCols}${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_commune_district FOREIGN KEY (district_id) REFERENCES ${districtsTable}(id) ON DELETE CASCADE${optionalFk}
      );
    `;
    await this.#db.client.queryObject(query);
  }

  async drop(): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${this.tableName};`;
    await this.#db.client.queryObject(query);
  }
}

let _instance: CommunesPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link CommunesPostgresDDL}.
 */
export function injectCommunesPostgresDDL(
  config: MadaAdmConfigValues,
): CommunesPostgresDDL {
  if (!_instance) _instance = new CommunesPostgresDDL(config);
  return _instance;
}
