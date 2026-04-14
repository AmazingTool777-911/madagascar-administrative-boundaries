import type { MaybePromise } from "@scope/types/utils";
import type { TableDDL } from "@scope/types/db";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { StringUtils } from "@scope/utils";

/**
 * Abstract base class for all administrative table DDL implementations.
 * Provides shared logic for configuration management and table name generation.
 */
export abstract class BaseAdmTableDDL implements TableDDL {
  /** The specific configuration values for this DDL instance. */
  protected config: MadaAdmConfigValues;

  /**
   * Initializes a new instance of BaseAdmTableDDL.
   *
   * @param config - The administrative configuration values.
   */
  constructor(config: MadaAdmConfigValues) {
    this.config = config;
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
  abstract drop(): MaybePromise<void>;

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
}
