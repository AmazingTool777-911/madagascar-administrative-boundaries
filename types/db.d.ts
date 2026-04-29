import type { Transaction } from "@db/postgres";
import type { DbType } from "@scope/consts/db";
import type { AdmLevelCode } from "@scope/consts/models";
import type { MaybePromise } from "./utils.d.ts";
import type {
  Commune,
  CommuneAttributes,
  CommuneRecord,
  District,
  DistrictAttributes,
  DistrictRecord,
  EntityId,
  Fokontany,
  FokontanyAttributes,
  FokontanyRecord,
  MadaAdmConfig,
  MadaAdmConfigValues,
  Province,
  ProvinceRecord,
  Region,
  RegionRecord,
} from "./models.d.ts";

export type {
  Commune,
  CommuneAttributes,
  CommuneRecord,
  District,
  DistrictAttributes,
  DistrictRecord,
  EntityId,
  Fokontany,
  FokontanyAttributes,
  FokontanyRecord,
  MadaAdmConfig,
  MadaAdmConfigValues,
  Province,
  ProvinceRecord,
  Region,
  RegionRecord,
};

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
   * The lastest db connection params used to connect to the database.
   */
  get params(): DbConnectionParams;

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
 * Attributes used to uniquely identify a province.
 */
export type ProvinceAttributes = { province: string };

/**
 * Attributes used to uniquely identify a region.
 */
export type RegionAttributes = { region: string };

/**
 * Data Manipulation Layer interface for the provinces table.
 */
export interface ProvinceTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple provinces by their names.
   *
   * @param names - The province names to retrieve.
   * @returns An array of matching province entities.
   */
  getManyByNames(
    names: string[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Province[]>;

  /**
   * Updates the province name of the record identified by the given attributes.
   *
   * @param attributes - The unique identifying attributes of the province.
   * @param value - The new province name value to assign.
   */
  updateFieldByAttributes(
    attributes: ProvinceAttributes,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  createMany(values: ProvinceRecord[]): MaybePromise<DMLCreateManyResult>;
}

/**
 * Data Manipulation Layer interface for the regions table.
 */
export interface RegionTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple regions by their names.
   *
   * @param names - The region names to retrieve.
   * @returns An array of matching region entities.
   */
  getManyByNames(
    names: string[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Region[]>;

  /**
   * Retrieves multiple regions whose nearest parent province ID is among the provided set.
   *
   * @param provinceIds - The province IDs to filter by.
   * @returns An array of matching region entities.
   */
  getManyByProvinceIds(
    provinceIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Region[]>;

  /**
   * Updates the region name of the record identified by the given attributes.
   *
   * @param attributes - The unique identifying attributes of the region.
   * @param value - The new region name value to assign.
   */
  updateFieldByAttributes(
    attributes: RegionAttributes,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  /**
   * Updates the region name of all region records whose IDs belong to the provided set.
   *
   * @param ids - The region IDs to target.
   * @param value - The new region name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode: AdmLevelCode.REGION | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  createMany(values: RegionRecord[]): MaybePromise<DMLCreateManyResult>;
}

/**
 * Data Manipulation Layer interface for the districts table.
 */
export interface DistrictTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple districts by their unique attributes.
   *
   * @param attributes - The list of district identifying attributes.
   * @returns An array of matching district entities.
   */
  getManyByAttributes(
    attributes: DistrictAttributes[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<District[]>;

  /**
   * Retrieves multiple districts whose nearest parent region ID is among the provided set.
   *
   * @param regionIds - The region IDs to filter by.
   * @returns An array of matching district entities.
   */
  getManyByRegionIds(
    regionIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<District[]>;

  /**
   * Updates the district name of the record identified by the given attributes.
   *
   * @param attributes - The unique identifying attributes of the district.
   * @param value - The new district name value to assign.
   */
  updateFieldByAttributes(
    attributes: DistrictAttributes,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  /**
   * Updates the district name of all district records whose IDs belong to the provided set.
   *
   * @param ids - The district IDs to target.
   * @param value - The new district name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode:
      | AdmLevelCode.DISTRICT
      | AdmLevelCode.REGION
      | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  createMany(values: DistrictRecord[]): MaybePromise<DMLCreateManyResult>;
}

/**
 * Data Manipulation Layer interface for the communes table.
 */
export interface CommuneTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple communes by their unique attributes.
   *
   * @param attributes - The list of commune identifying attributes.
   * @returns An array of matching commune entities.
   */
  getManyByAttributes(
    attributes: CommuneAttributes[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Commune[]>;

  /**
   * Retrieves multiple communes whose nearest parent district ID is among the provided set.
   *
   * @param districtIds - The district IDs to filter by.
   * @returns An array of matching commune entities.
   */
  getManyByDistrictIds(
    districtIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Commune[]>;

  /**
   * Updates the commune name of the record identified by the given attributes.
   *
   * @param attributes - The unique identifying attributes of the commune.
   * @param value - The new commune name value to assign.
   */
  updateFieldByAttributes(
    attributes: CommuneAttributes,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  /**
   * Updates the commune name of all commune records whose IDs belong to the provided set.
   *
   * @param ids - The commune IDs to target.
   * @param value - The new commune name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode:
      | AdmLevelCode.COMMUNE
      | AdmLevelCode.DISTRICT
      | AdmLevelCode.REGION
      | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  createMany(values: CommuneRecord[]): MaybePromise<DMLCreateManyResult>;
}

/**
 * Data Manipulation Layer interface for the fokontanys table.
 */
export interface FokontanyTableDML extends BaseAdmTableDML {
  /**
   * Retrieves multiple fokontanys whose nearest parent commune ID is among the provided set.
   *
   * @param communeIds - The commune IDs to filter by.
   * @returns An array of matching fokontany entities.
   */
  getManyByCommuneIds(
    communeIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): MaybePromise<Fokontany[]>;

  /**
   * Updates the fokontany name of the record identified by the given attributes.
   *
   * @param attributes - The unique identifying attributes of the fokontany.
   * @param value - The new fokontany name value to assign.
   */
  updateFieldByAttributes(
    attributes: FokontanyAttributes,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  /**
   * Updates the fokontany name of all fokontany records whose IDs belong to the provided set.
   *
   * @param ids - The fokontany IDs to target.
   * @param value - The new fokontany name value to assign.
   */
  updateFieldByIds(
    ids: EntityId[],
    fieldCode:
      | AdmLevelCode.FOKONTANY
      | AdmLevelCode.COMMUNE
      | AdmLevelCode.DISTRICT
      | AdmLevelCode.REGION
      | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): MaybePromise<void>;

  createMany(values: FokontanyRecord[]): MaybePromise<DMLCreateManyResult>;
}
