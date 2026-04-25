import type { Transaction } from "@db/postgres";
import type { DbType } from "@scope/consts/db";
import type { MaybePromise } from "./utils.d.ts";
import type {
  CommuneRecord,
  DistrictRecord,
  FokontanyRecord,
  MadaAdmConfig,
  MadaAdmConfigValues,
  Province,
  ProvinceRecord,
  RegionRecord,
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
  /**
   * Filename of a CA certificate located under the shared `db/.ca-certificates/`
   * directory. Takes precedence over `caCertPath` when both are provided.
   */
  caCertFile?: string;
  /** Full pathname to the CA certificate file, used when `caCertFile` is not set. */
  caCertPath?: string;
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
export interface DMLCreateManyResult {
  /** The number of rows successfully inserted. */
  insertedCount: number;
}

/**
 * Data Manipulation Layer interface for the mada adm config table.
 */
export interface MadaAdmConfigDML {
  get(): MaybePromise<MadaAdmConfig | null>;
  createOrUpdate(values: MadaAdmConfigValues): MaybePromise<MadaAdmConfig>;
}

/**
 * Base interface for ADM Data Manipulation Layer (DML) operations.
 */
export interface BaseAdmTableDML {
  /**
   * Removes duplicate records from the table based on specific administrative criteria.
   * Keeps only the record with the smallest ID for each unique set of keys.
   */
  deleteDuplicates(): MaybePromise<void>;
}

/**
 * Data Manipulation Layer interface for the provinces table.
 */
export interface ProvinceTableDML extends BaseAdmTableDML {
  getManyByNames(names: string[]): MaybePromise<Province[]>;

  createMany(values: ProvinceRecord[]): MaybePromise<DMLCreateManyResult>;
}

/**
 * Data Manipulation Layer interface for the regions table.
 */
export interface RegionTableDML extends BaseAdmTableDML {
  createMany(values: RegionRecord[]): MaybePromise<DMLCreateManyResult>;
}

/**
 * Data Manipulation Layer interface for the districts table.
 */
export interface DistrictTableDML extends BaseAdmTableDML {
  createMany(values: DistrictRecord[]): MaybePromise<DMLCreateManyResult>;
}

/**
 * Data Manipulation Layer interface for the communes table.
 */
export interface CommuneTableDML extends BaseAdmTableDML {
  createMany(values: CommuneRecord[]): MaybePromise<DMLCreateManyResult>;
}

/**
 * Data Manipulation Layer interface for the fokontanys table.
 */
export interface FokontanyTableDML extends BaseAdmTableDML {
  createMany(values: FokontanyRecord[]): MaybePromise<DMLCreateManyResult>;
}
