import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { DbTransactionContext } from "@scope/types/db";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the communes table
 * using PostgreSQL.
 */
export class CommunesPostgresDDL extends BaseAdmTableDDL {
  constructor(
    protected db: PostgresDbConnection,
    config: MadaAdmConfigValues,
    schema: string = "public",
  ) {
    super(config, schema);
  }

  get tableName(): string {
    return this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.COMMUNE)! + "s",
    );
  }

  async create(transactionContext?: DbTransactionContext): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geojson GEOMETRY(Geometry, 4326) NOT NULL,"
      : "";
    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level SMALLINT NOT NULL DEFAULT 3,"
      : "";

    const regionsTable = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.REGION)! + "s",
    );
    const provincesTable = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );
    const districtsTable = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.DISTRICT)! + "s",
    );

    let optionalCols = "";
    let optionalFk = "";

    if (this.config.isProvinceRepeated) {
      optionalCols += "\n        province VARCHAR(255) NOT NULL,";
    }
    if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
      optionalCols += "\n        province_id INTEGER NOT NULL,";
      optionalFk +=
        `,\n        CONSTRAINT fk_commune_province FOREIGN KEY (province_id) REFERENCES ${this.schema}.${provincesTable}(id) ON DELETE CASCADE`;
    }
    if (this.config.isFkRepeated) {
      optionalCols += "\n        region_id INTEGER NOT NULL,";
      optionalFk +=
        `,\n        CONSTRAINT fk_commune_region FOREIGN KEY (region_id) REFERENCES ${this.schema}.${regionsTable}(id) ON DELETE CASCADE`;
    }

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.schema}.${this.tableName} (
        id SERIAL PRIMARY KEY,
        commune VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        region VARCHAR(255) NOT NULL,
        district_id INTEGER NOT NULL,${optionalCols}${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_commune_district FOREIGN KEY (district_id) REFERENCES ${this.schema}.${districtsTable}(id) ON DELETE CASCADE${optionalFk}
      );
    `;
    const client = this.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? (transactionContext?.tx ?? this.db.client)
      : this.db.client;
    await client.queryObject(query);
  }

  async drop(transactionContext?: DbTransactionContext): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${this.schema}.${this.tableName};`;
    const client = this.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? (transactionContext?.tx ?? this.db.client)
      : this.db.client;
    await client.queryObject(query);
  }

  /**
   * Checks if the communes physical table exists in the PostgreSQL database.
   *
   * @returns A promise that resolves to true if the table exists, false otherwise.
   */
  async exists(transactionContext?: DbTransactionContext): Promise<boolean> {
    const query = `
      SELECT EXISTS (
         SELECT FROM pg_tables
         WHERE  schemaname = '${this.schema}'
         AND    tablename  = '${this.tableName}'
      );
    `;
    const client = this.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? (transactionContext?.tx ?? this.db.client)
      : this.db.client;
    const result = await client.queryObject<{ exists: boolean }>(query);
    return result.rows[0]?.exists ?? false;
  }
}

let _instance: CommunesPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link CommunesPostgresDDL}.
 *
 * @param config - The runtime ADM configuration.
 * @param db - The PostgreSQL database connection.
 * @param schema - The ADM schema binding.
 * @returns The instance of the communes table DDL.
 */
export function injectCommunesPostgresDDL(
  config: MadaAdmConfigValues,
  db: PostgresDbConnection,
  schema: string = "public",
): CommunesPostgresDDL {
  if (!_instance) _instance = new CommunesPostgresDDL(db, config, schema);
  return _instance;
}

/**
 * Resets the singleton instance of the communes table DDL.
 */
export function resetCommunesPostgresDDL(): void {
  _instance = null;
}
