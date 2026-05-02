import * as path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  DbConnection,
  DbConnectionParams,
  DbTransactionContext,
  SQLiteConnectionParams,
} from "@scope/types/db";
import type { MaybePromise } from "@scope/types/utils";
import {
  DbType,
  SQLITE_DB_DEFAULT_FILE,
  SQLITE_DB_DIR,
} from "@scope/consts/db";

export class SqliteDbConnection implements DbConnection {
  #client: DatabaseSync | null = null;

  get client(): DatabaseSync {
    if (!this.#client) {
      throw new Error(
        "SQLite client has not been initialized. Call connect() first.",
      );
    }
    return this.#client;
  }

  #params: SQLiteConnectionParams | null = null;

  get params(): SQLiteConnectionParams {
    if (!this.#params) {
      throw new Error(
        "SQLite connection params have not been set. Call connect() first.",
      );
    }
    return this.#params;
  }

  connect(params: DbConnectionParams): MaybePromise<void> {
    if (params.dbType !== DbType.SQLite) {
      throw new Error(
        `Only SQLite database connections are supported by this adapter. Received ${params.dbType}`,
      );
    }

    if (this.#client) {
      this.#client.close();
    }

    let fullDbPath: string;
    if (params.dbPath) {
      fullDbPath = path.join(params.dbPath);
    } else {
      let dbDirExists = false;
      try {
        Deno.statSync(SQLITE_DB_DIR);
        dbDirExists = true;
      } catch {
        dbDirExists = false;
      }
      if (!dbDirExists) {
        Deno.mkdirSync(SQLITE_DB_DIR, { recursive: true });
      }
      const dbFileName = params.dbFile ?? SQLITE_DB_DEFAULT_FILE;
      fullDbPath = path.join(SQLITE_DB_DIR, dbFileName);
    }
    this.#client = new DatabaseSync(fullDbPath, { allowExtension: true });
    this.#client.loadExtension("mod_spatialite");
    this.#client.exec("SELECT InitSpatialMetaData(1);");

    this.#params = params;
  }

  close(): MaybePromise<void> {
    this.client.close();
    this.#client = null;
    this.#params = null;
  }

  transaction<TReturn>(
    callback: (
      transactionContext: DbTransactionContext,
    ) => MaybePromise<TReturn>,
  ): MaybePromise<TReturn> {
    this.client.exec("BEGIN");
    try {
      const res = callback({ dbType: DbType.SQLite });
      this.client.exec("COMMIT");
      return res;
    } catch (error) {
      this.client.exec("ROLLBACK");
      throw error;
    }
  }
}

let sqliteDbConnection: SqliteDbConnection | null = null;

export function injectSqliteDbConnection(): SqliteDbConnection {
  if (!sqliteDbConnection) {
    sqliteDbConnection = new SqliteDbConnection();
  }

  return sqliteDbConnection;
}
