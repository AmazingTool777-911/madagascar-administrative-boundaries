import { StringUtils } from "@scope/utils";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";
import type { DMLInsertManyResult } from "@scope/types/db";

/**
 * Abstract base class for ADM Data Manipulation Layer (DML) implementations
 * using PostgreSQL.
 */
export abstract class BaseAdmPostgresTableDML {
  constructor(
    protected config: MadaAdmConfigValues,
    protected db: PostgresDbConnection,
    protected schema: string = "public",
  ) {}

  /**
   * Generates the physical database table name by applying the prefix
   * from the configuration and converting it to snake_case.
   *
   * @param baseName - The base name of the administrative table (e.g., 'regions').
   * @returns The fully qualified table name.
   */
  protected getTableName(baseName: string): string {
    return StringUtils.prefixWithSnakeCase(this.config.tablesPrefix, baseName);
  }

  /**
   * Internal helper to execute a batch insertion within a transaction.
   *
   * @param tableName - The name of the table to insert into.
   * @param columns - The list of column names for the insert statement.
   * @param rows - The data rows to insert.
   * @param rowToArgs - A mapper function that provides placeholders and arguments for a single row.
   * @returns A promise resolving to the result of the batch insertion.
   */
  protected async _createMany<T>(
    tableName: string,
    columns: string[],
    rows: T[],
    rowToArgs: (
      row: T,
      argIndex: number,
    ) => { placeholders: string[]; args: unknown[] },
  ): Promise<DMLInsertManyResult> {
    if (rows.length === 0) return { insertedCount: 0 };

    return await this.db.transaction(async ({ tx }) => {
      const allPlaceholders: string[] = [];
      const allArgs: unknown[] = [];
      let currentArgIndex = 1;

      for (const row of rows) {
        const { placeholders, args } = rowToArgs(row, currentArgIndex);
        allPlaceholders.push(`(${placeholders.join(", ")})`);
        allArgs.push(...args);

        // Calculate how many parameterized arguments were added (those starting with $)
        const paramCount = placeholders.filter((p) => p.startsWith("$")).length;
        currentArgIndex += paramCount;
      }

      const sql = `
        INSERT INTO ${this.schema}.${tableName} (${columns.join(", ")})
        VALUES ${allPlaceholders.join(", ")};
      `;

      await tx.queryObject(sql, allArgs);

      return { insertedCount: rows.length };
    });
  }
}
