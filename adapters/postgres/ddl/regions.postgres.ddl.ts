import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { DbTransactionContext } from "@scope/types/db";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the DDL abstract class for the regions table
 * using PostgreSQL.
 */
export class RegionsPostgresDDL extends BaseAdmTableDDL {
  constructor(
    protected db: PostgresDbConnection,
    config: MadaAdmConfigValues,
    schema: string = "public",
  ) {
    super(config, schema);
  }

  get tableName(): string {
    return this.getTableName("regions");
  }

  async create(transactionContext?: DbTransactionContext): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geojson GEOMETRY(Geometry, 4326) NOT NULL,"
      : "";
    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level SMALLINT NOT NULL DEFAULT 1,"
      : "";
    const provincesTable = this.getTableName("provinces");

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.schema}.${this.tableName} (
        id SERIAL PRIMARY KEY,
        region VARCHAR(255) NOT NULL,
        province VARCHAR(255) NOT NULL,
        province_id INTEGER NOT NULL,${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_region_province FOREIGN KEY (province_id) REFERENCES ${this.schema}.${provincesTable}(id) ON DELETE CASCADE
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
   * Checks if the regions physical table exists in the PostgreSQL database.
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

let _instance: RegionsPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link RegionsPostgresDDL}.
 *
 * @param config - The runtime ADM configuration.
 * @param db - The PostgreSQL database connection.
 * @param schema - The ADM schema binding.
 */
export function injectRegionsPostgresDDL(
  config: MadaAdmConfigValues,
  db: PostgresDbConnection,
  schema: string = "public",
): RegionsPostgresDDL {
  if (!_instance) _instance = new RegionsPostgresDDL(db, config, schema);
  return _instance;
}
