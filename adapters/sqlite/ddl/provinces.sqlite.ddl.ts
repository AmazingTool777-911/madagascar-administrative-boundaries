import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { BaseAdmTableDDL } from "@scope/db/ddl/base";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { DbTransactionContext } from "@scope/types/db";
import { ensureIsSqliteDbTransactionCtx } from "@scope/helpers/db";
import type { SqliteDbConnection } from "@scope/adapters/sqlite";

/**
 * Concrete implementation of the DDL abstract class for the provinces table
 * using SQLite (SpatiaLite). It leverages the provided ADM configuration to dynamically
 * handle table naming and optional features like spatial data.
 */
export class ProvincesSqliteDDL extends BaseAdmTableDDL {
  /**
   * Initializes a new instance of ProvincesSqliteDDL.
   *
   * @param db - The SQLite database connection.
   * @param config - The runtime ADM configuration to use for the table definitions.
   */
  constructor(
    protected db: SqliteDbConnection,
    config: MadaAdmConfigValues,
  ) {
    super(config);
  }

  /**
   * Generates the dynamic table name based on the configuration prefix.
   *
   * @returns The resolved table name.
   */
  get tableName(): string {
    return this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );
  }

  /**
   * Creates the provinces physical table in the SQLite database if it does not already exist.
   * Leverages SpatiaLite for geometry columns if enabled.
   *
   * @returns A promise that resolves when the table creation is complete.
   */
  create(transactionContext?: DbTransactionContext): void {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }

    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level INTEGER NOT NULL DEFAULT 0,"
      : "";

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        province VARCHAR(255) NOT NULL,${admLevelColumn}
        created_at DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
      );
    `;
    this.db.client.exec(query);

    if (this.config.hasGeojson) {
      // Add geometry column using SpatiaLite if it doesn't exist
      const geomExists = this.db.client.prepare(
        "SELECT count(*) as count FROM geometry_columns WHERE f_table_name = ? AND f_geometry_column = ?",
      ).get(this.tableName, "geojson") as { count: number };

      if (geomExists.count === 0) {
        this.db.client.exec(`
          SELECT AddGeometryColumn('${this.tableName}', 'geojson', 4326, 'GEOMETRY', 'XY', 1);
        `);
      }

      // Create spatial index if it doesn't exist
      const spatialIndexExists = this.db.client.prepare(
        "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name = ?",
      ).get(`idx_${this.tableName}_geojson`) as { count: number };

      if (spatialIndexExists.count === 0) {
        this.db.client.exec(`
          SELECT CreateSpatialIndex('${this.tableName}', 'geojson');
        `);
      }
    }

    // Standard index for faster lookups
    this.db.client.exec(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_province_lower 
      ON ${this.tableName} (lower(province));
    `);
  }

  /**
   * Drops the provinces physical table from the SQLite database if it exists.
   *
   * @returns A promise that resolves when the table drop is complete.
   */
  drop(transactionContext?: DbTransactionContext): void {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }
    const query = `DROP TABLE IF EXISTS ${this.tableName};`;
    this.db.client.exec(query);

    // Also drop spatial metadata if exists
    if (this.config.hasGeojson) {
      this.db.client.exec(
        `DELETE FROM geometry_columns WHERE f_table_name = '${this.tableName}'`,
      );
    }
  }

  /**
   * Checks if the provinces physical table exists in the SQLite database.
   *
   * @returns A promise that resolves to true if the table exists, false otherwise.
   */
  exists(transactionContext?: DbTransactionContext): boolean {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }
    const query = `
      SELECT name FROM sqlite_master WHERE type='table' AND name='${this.tableName}';
    `;
    const stmt = this.db.client.prepare(query);
    return !!stmt.get();
  }
}

let _instance: ProvincesSqliteDDL | null = null;

/**
 * Injects (or creates) an instance of {@link ProvincesSqliteDDL}.
 *
 * @param config - The ADM configuration binding.
 * @param db - The SQLite database connection.
 * @returns The instance of the provinces table DDL.
 */
export function injectProvincesSqliteDDL(
  config: MadaAdmConfigValues,
  db: SqliteDbConnection,
): ProvincesSqliteDDL {
  if (!_instance) _instance = new ProvincesSqliteDDL(db, config);
  return _instance;
}

/**
 * Resets the singleton instance of the provinces table DDL.
 */
export function resetProvincesSqliteDDL(): void {
  _instance = null;
}
