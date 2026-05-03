import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { BaseAdmTableDDL } from "@scope/db/ddl/base";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { DbTransactionContext } from "@scope/types/db";
import { ensureIsSqliteDbTransactionCtx } from "@scope/helpers/db";
import type { SqliteDbConnection } from "@scope/adapters/sqlite";

/**
 * Concrete implementation of the DDL abstract class for the regions table
 * using SQLite (SpatiaLite).
 */
export class RegionsSqliteDDL extends BaseAdmTableDDL {
  constructor(
    protected db: SqliteDbConnection,
    config: MadaAdmConfigValues,
  ) {
    super(config);
  }

  get tableName(): string {
    return this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.REGION)! + "s",
    );
  }

  create(transactionContext?: DbTransactionContext): void {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }

    const admLevelColumn = this.config.hasAdmLevel
      ? "\n        adm_level INTEGER NOT NULL DEFAULT 1,"
      : "";
    const provincesTable = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );

    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region VARCHAR(255) NOT NULL,
        province VARCHAR(255) NOT NULL,
        province_id INTEGER NOT NULL,${admLevelColumn}
        created_at DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT fk_region_province FOREIGN KEY (province_id) REFERENCES ${provincesTable}(id) ON DELETE CASCADE
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

    this.db.client.exec(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_region_lower 
      ON ${this.tableName} (lower(region));
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_province_id 
      ON ${this.tableName} (province_id);
    `);
  }

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

let _instance: RegionsSqliteDDL | null = null;

export function injectRegionsSqliteDDL(
  config: MadaAdmConfigValues,
  db: SqliteDbConnection,
): RegionsSqliteDDL {
  if (!_instance) _instance = new RegionsSqliteDDL(db, config);
  return _instance;
}

export function resetRegionsSqliteDDL(): void {
  _instance = null;
}
