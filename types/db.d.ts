import type { Transaction } from "@db/postgres";
import type { DbType } from "@scope/consts/db";
import type { MaybePromise } from "./utils.d.ts";
import type {
  CommuneValues,
  DistrictValues,
  FokontanyValues,
  ProvinceValues,
  RegionValues,
} from "./models.d.ts";

/**
 * Represents the transaction context for a specific database type.
 */
export type PostgresTransactionContext = {
  dbType: DbType.Postgres;
  tx: Transaction;
};

/**
 * Represents the transaction context for a specific database type.
 */
export type DbTransactionContext = PostgresTransactionContext;

/**
 * Represents a database connection.
 */
export interface DbConnection {
  /**
   * Attempts to establish a connection to the database.
   * @param params - The parameters for connecting to the database.
   */
  connect(params: DbConnectionParams): MaybePromise<void>;

  /**
   * Closes the active database connection.
   */
  close(): MaybePromise<void>;

  /**
   * Executes the given callback inside a database transaction.
   * The callback can be synchronous or asynchronous.
   *
   * @param callback - The function to execute within the transaction.
   * @returns The result of the callback.
   */
  transaction<TReturn>(
    callback: (
      transactionContext: DbTransactionContext,
    ) => MaybePromise<TReturn>,
  ): MaybePromise<TReturn>;
}

/**
 * Detailed configuration for a PostgreSQL database connection.
 */
export interface PostgresConnectionConfig {
  /** The hostname or IP address of the database server. */
  host: string;
  /** The port number the database server is listening on. */
  port: number;
  /** The username to use for authentication. */
  username: string;
  /** The password to use for authentication. */
  password: string;
  /** The name of the database to connect to. */
  database: string;
  /** Whether to use SSL for the connection. */
  ssl?: boolean;
  /** The maximum size of the connection pool. */
  poolSize?: number;
}

/**
 * Connection parameters specifically for a PostgreSQL database.
 */
export interface PostgresConnectionParams {
  /** The type of database, fixed to Postgres. */
  dbType: DbType.Postgres;
  /** Either a connection string (URL) or a configuration object. */
  connection: string | PostgresConnectionConfig;
}

/**
 * Union type of all supported database connection parameters.
 * Initially supports only PostgreSQL.
 */
export type DbConnectionParams = PostgresConnectionParams;

export interface TableDDL {
  /** The physical database table name. */
  readonly tableName: string;
  create(transactionContext?: DbTransactionContext): MaybePromise<void>;
  drop(transactionContext?: DbTransactionContext): MaybePromise<void>;
  exists(transactionContext?: DbTransactionContext): MaybePromise<boolean>;
}

/**
 * Result of a batch insertion operation.
 */
export interface DMLInsertManyResult {
  /** The number of rows successfully inserted. */
  insertedCount: number;
}

/**
 * Data Manipulation Layer interface for the provinces table.
 */
export interface ProvinceTableDML {
  createMany(values: ProvinceValues[]): MaybePromise<DMLInsertManyResult>;
}

/**
 * Data Manipulation Layer interface for the regions table.
 */
export interface RegionTableDML {
  createMany(values: RegionValues[]): MaybePromise<DMLInsertManyResult>;
}

/**
 * Data Manipulation Layer interface for the districts table.
 */
export interface DistrictTableDML {
  createMany(values: DistrictValues[]): MaybePromise<DMLInsertManyResult>;
}

/**
 * Data Manipulation Layer interface for the communes table.
 */
export interface CommuneTableDML {
  createMany(values: CommuneValues[]): MaybePromise<DMLInsertManyResult>;
}

/**
 * Data Manipulation Layer interface for the fokontanys table.
 */
export interface FokontanyTableDML {
  createMany(values: FokontanyValues[]): MaybePromise<DMLInsertManyResult>;
}
