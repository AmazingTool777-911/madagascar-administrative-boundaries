import { BaseAdmTableDDL } from "@scope/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { DbTransactionContext } from "@scope/types/db";
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
   * @param schema - The physical database schema name. Defaults to 'public'.
   */
  constructor(config: MadaAdmConfigValues, schema: string = "public") {
    super(config, schema);
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
  async create(transactionContext?: DbTransactionContext): Promise<void> {
    const geometryColumn = this.config.hasGeojson
      ? "\n        geometry GEOMETRY(Geometry, 4326),"
      : "";
    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level SMALLINT NOT NULL DEFAULT 0,"
      : "";

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.schema}.${this.tableName} (
        id SERIAL PRIMARY KEY,
        province VARCHAR(255) NOT NULL,${admLevelColumn}${geometryColumn}
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;
    const client = this.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? (transactionContext?.tx ?? this.#db.client)
      : this.#db.client;
    await client.queryObject(query);
  }

  /**
   * Drops the provinces physical table from the PostgreSQL database if it exists.
   *
   * @returns A promise that resolves when the table drop is complete.
   */
  async drop(transactionContext?: DbTransactionContext): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${this.schema}.${this.tableName};`;
    const client = this.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? (transactionContext?.tx ?? this.#db.client)
      : this.#db.client;
    await client.queryObject(query);
  }

  /**
   * Checks if the provinces physical table exists in the PostgreSQL database.
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
      ? (transactionContext?.tx ?? this.#db.client)
      : this.#db.client;
    const result = await client.queryObject<{ exists: boolean }>(query);
    return result.rows[0]?.exists ?? false;
  }
}

let _instance: ProvincesPostgresDDL | null = null;

/**
 * Injects (or creates) an instance of {@link ProvincesPostgresDDL}.
 *
 * @param config - The ADM configuration binding.
 * @param schema - The ADM schema binding.
 * @returns The instance of the provinces table DDL.
 */
export function injectProvincesPostgresDDL(
  config: MadaAdmConfigValues,
  schema: string = "public",
): ProvincesPostgresDDL {
  if (!_instance) _instance = new ProvincesPostgresDDL(config, schema);
  return _instance;
}
