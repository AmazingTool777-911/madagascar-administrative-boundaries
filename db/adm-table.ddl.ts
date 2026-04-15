import type { MaybePromise } from "@scope/types/utils";
import type {
  TableDDL,
  DbTransactionContext,
  PostgresTransactionContext,
} from "@scope/types/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { StringUtils } from "@scope/utils";
import { DbType } from "@scope/consts/db";

/**
 * Abstract base class for all administrative table DDL implementations.
 * Provides shared logic for configuration management and table name generation.
 */
export abstract class BaseAdmTableDDL implements TableDDL {
  /** The specific configuration values for this DDL instance. */
  protected config: MadaAdmConfigValues;

  /** The physical database schema name. */
  protected schema: string;

  /**
   * Initializes a new instance of BaseAdmTableDDL.
   *
   * @param config - The administrative configuration values.
   * @param schema - The physical database schema name. Defaults to 'public'.
   */
  constructor(config: MadaAdmConfigValues, schema: string = "public") {
    this.config = config;
    this.schema = schema;
  }

  /**
   * Abstract getter for the physical database table name.
   */
  abstract get tableName(): string;

  /**
   * Abstract method to create the physical table in the database.
   */
  abstract create(): MaybePromise<void>;

  /**
   * Abstract method to drop the physical table from the database.
   */
  abstract drop(transactionContext?: DbTransactionContext): MaybePromise<void>;

  /**
   * Abstract method to check if the physical table exists in the database.
   */
  abstract exists(transactionContext?: DbTransactionContext): MaybePromise<boolean>;

  /**
   * Generates a dynamically prefixed table name in either snake_case or camelCase.
   *
   * @param baseName - The un-prefixed table name (e.g. 'provinces').
   * @param format - The output casing format. Defaults to 'snake'.
   * @returns The fully formulated table name string.
   */
  protected getTableName(
    baseName: string,
    format: "snake" | "camel" = "snake",
  ): string {
    return format === "snake"
      ? StringUtils.prefixWithSnakeCase(this.config.tablesPrefix, baseName)
      : StringUtils.prefixWithCamelCase(this.config.tablesPrefix, baseName);
  }

  protected ensureIsPostgresDbTransactionCtx(
    transactionContext?: DbTransactionContext,
  ): transactionContext is PostgresTransactionContext {
    if (transactionContext) {
      if (transactionContext.dbType !== DbType.Postgres) {
        throw new Error(
          "Transaction context type does not match database type",
        );
      }
      return true;
    }
    return false;
  }
}
