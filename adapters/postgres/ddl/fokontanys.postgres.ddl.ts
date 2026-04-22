import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { DbTransactionContext } from "@scope/types/db";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the fokontanys table
 * using PostgreSQL.
 */
export class FokontanysPostgresDDL extends BaseAdmTableDDL {
  constructor(
    protected db: PostgresDbConnection,
    config: MadaAdmConfigValues,
    schema: string = "public",
  ) {
    super(config, schema);
  }

  get tableName(): string {
    return this.getTableName("fokontanys");
  }

  async create(transactionContext?: DbTransactionContext): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geojson GEOMETRY(Geometry, 4326) NOT NULL,"
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
        `,\n        CONSTRAINT fk_fokontany_province FOREIGN KEY (province_id) REFERENCES ${this.schema}.${provincesTable}(id) ON DELETE CASCADE`;
    }
    if (this.config.isFkRepeated) {
      optionalCols += "\n        region_id INTEGER NOT NULL,";
      optionalCols += "\n        district_id INTEGER NOT NULL,";
      optionalFk +=
        `,\n        CONSTRAINT fk_fokontany_region FOREIGN KEY (region_id) REFERENCES ${this.schema}.${regionsTable}(id) ON DELETE CASCADE`;
      optionalFk +=
        `,\n        CONSTRAINT fk_fokontany_district FOREIGN KEY (district_id) REFERENCES ${this.schema}.${districtsTable}(id) ON DELETE CASCADE`;
    }

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.schema}.${this.tableName} (
        id SERIAL PRIMARY KEY,
        fokontany VARCHAR(255) NOT NULL,
        commune VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        region VARCHAR(255) NOT NULL,
        commune_id INTEGER NOT NULL,${optionalCols}${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_fokontany_commune FOREIGN KEY (commune_id) REFERENCES ${this.schema}.${communesTable}(id) ON DELETE CASCADE${optionalFk}
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
   * Checks if the fokontanys physical table exists in the PostgreSQL database.
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

let _instance: FokontanysPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link FokontanysPostgresDDL}.
 *
 * @param config - The runtime ADM configuration.
 * @param db - The PostgreSQL database connection.
 * @param schema - The ADM schema binding.
 */
export function injectFokontanysPostgresDDL(
  config: MadaAdmConfigValues,
  db: PostgresDbConnection,
  schema: string = "public",
): FokontanysPostgresDDL {
  if (!_instance) _instance = new FokontanysPostgresDDL(db, config, schema);
  return _instance;
}
