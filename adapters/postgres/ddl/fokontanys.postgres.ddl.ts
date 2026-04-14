import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { injectPostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the fokontanys table
 * using PostgreSQL.
 */
export class FokontanysPostgresDDL extends BaseAdmTableDDL {
  #db = injectPostgresDbConnection();

  constructor(config: MadaAdmConfigValues) {
    super(config);
  }

  get tableName(): string {
    return this.getTableName("fokontanys");
  }

  async create(): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geometry GEOMETRY(Geometry, 4326),"
      : "";
    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level SMALLINT NOT NULL DEFAULT 4,"
      : "";

    const regionsTable = this.getTableName("regions");
    const provincesTable = this.getTableName("provinces");
    const districtsTable = this.getTableName("districts");
    const communesTable = this.getTableName("communes");

    let optionalCols = "";
    let optionalFk = "";

    if (this.config.isProvinceRepeated) {
      optionalCols += "\n        province VARCHAR(255) NOT NULL,";
    }
    if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
      optionalCols += "\n        province_id INTEGER NOT NULL,";
      optionalFk +=
        `,\n        CONSTRAINT fk_fokontany_province FOREIGN KEY (province_id) REFERENCES ${provincesTable}(id) ON DELETE CASCADE`;
    }
    if (this.config.isFkRepeated) {
      optionalCols += "\n        region_id INTEGER NOT NULL,";
      optionalCols += "\n        district_id INTEGER NOT NULL,";
      optionalFk +=
        `,\n        CONSTRAINT fk_fokontany_region FOREIGN KEY (region_id) REFERENCES ${regionsTable}(id) ON DELETE CASCADE`;
      optionalFk +=
        `,\n        CONSTRAINT fk_fokontany_district FOREIGN KEY (district_id) REFERENCES ${districtsTable}(id) ON DELETE CASCADE`;
    }

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        fokontany VARCHAR(255) NOT NULL,
        commune VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        region VARCHAR(255) NOT NULL,
        commune_id INTEGER NOT NULL,${optionalCols}${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_fokontany_commune FOREIGN KEY (commune_id) REFERENCES ${communesTable}(id) ON DELETE CASCADE${optionalFk}
      );
    `;
    await this.#db.client.queryObject(query);
  }

  async drop(): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${this.tableName};`;
    await this.#db.client.queryObject(query);
  }
}

let _instance: FokontanysPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link FokontanysPostgresDDL}.
 */
export function injectFokontanysPostgresDDL(
  config: MadaAdmConfigValues,
): FokontanysPostgresDDL {
  if (!_instance) _instance = new FokontanysPostgresDDL(config);
  return _instance;
}
