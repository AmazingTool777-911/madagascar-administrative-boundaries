import type { DbTransactionContext, TableDDL } from "@scope/types/db";
import type { MaybePromise } from "@scope/types/utils";
import { MADA_ADM_CONFIG_TABLE_NAME_SNAKE } from "@scope/consts/models";
import { ensureIsSqliteDbTransactionCtx } from "@scope/helpers/db";
import type { SqliteDbConnection } from "@scope/adapters/sqlite";

export class MadaAdmConfigSqliteDDL implements TableDDL {
  readonly tableName = MADA_ADM_CONFIG_TABLE_NAME_SNAKE;

  #db: SqliteDbConnection;

  constructor(db: SqliteDbConnection) {
    this.#db = db;
  }

  create(transactionContext?: DbTransactionContext): MaybePromise<void> {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }
    const sql = `
				CREATE TABLE IF NOT EXISTS ${this.tableName} (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					tables_prefix VARCHAR(50),
					is_fk_repeated BOOLEAN NOT NULL DEFAULT TRUE,
					is_province_repeated BOOLEAN NOT NULL DEFAULT FALSE,
					is_province_fk_repeated BOOLEAN NOT NULL DEFAULT FALSE,
					has_geojson BOOLEAN NOT NULL DEFAULT FALSE,
					has_adm_level BOOLEAN NOT NULL DEFAULT TRUE,
					created_at DATETIME NOT NULL DEFAULT (datetime('now')),
					updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
				)
			`;
    this.#db.client.exec(sql);
  }

  drop(transactionContext?: DbTransactionContext): MaybePromise<void> {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }
    const sql = `DROP TABLE IF EXISTS ${this.tableName}`;
    this.#db.client.exec(sql);
  }

  exists(transactionContext?: DbTransactionContext): MaybePromise<boolean> {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }
    const sql =
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${this.tableName}'`;
    const stmt = this.#db.client.prepare(sql);
    return !!stmt.get();
  }
}

let madaAdmConfigSQLiteDDL: MadaAdmConfigSqliteDDL | null = null;

export function injectMadaAdmConfigSqliteDDL(db: SqliteDbConnection) {
  if (!madaAdmConfigSQLiteDDL) {
    madaAdmConfigSQLiteDDL = new MadaAdmConfigSqliteDDL(db);
  }
  return madaAdmConfigSQLiteDDL;
}

export function resetMadaAdmConfigSqliteDDL() {
  madaAdmConfigSQLiteDDL = null;
}
