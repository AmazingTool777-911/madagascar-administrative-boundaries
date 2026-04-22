import { StringUtils } from "@scope/utils";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";
import type { DMLCreateManyResult } from "@scope/types/db";

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
   * Generates the fully qualified physical database table name by applying
   * the prefix from the configuration and prepending the schema name.
   *
   * @param baseName - The base name of the administrative table (e.g., 'regions').
   * @returns The fully qualified table name (e.g., 'public.mada_regions').
   */
  protected getTableName(baseName: string): string {
    const tableName = StringUtils.prefixWithSnakeCase(
      this.config.tablesPrefix,
      baseName,
    );
    return `${this.schema}.${tableName}`;
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
  ): Promise<DMLCreateManyResult> {
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
        const paramCount = placeholders
          .map((p) => p.match(/\$/g)?.length ?? 0)
          .reduce((sum, value) => sum + value, 0);
        currentArgIndex += paramCount;
      }

      const sql = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES ${allPlaceholders.join(", ")};
      `;

      const res = await tx.queryObject<{ rowCount: number }>(sql, allArgs);

      return { insertedCount: res.rowCount ?? 0 };
    });
  }

  /**
   * Internal helper to delete duplicate records from a table.
   *
   * @param tableName - The fully qualified name of the table to deduplicate.
   * @param partitionKeys - The columns to use for identifying duplicates.
   */
  protected async _deleteDuplicates(
    tableName: string,
    partitionKeys: string[],
  ): Promise<void> {
    const sql = `
      WITH CTE AS (
          SELECT id, 
                 ROW_NUMBER() OVER (
                     PARTITION BY ${partitionKeys.join(", ")}
                     ORDER BY id ASC
                 ) AS row_num
          FROM ${tableName}
      )
      DELETE FROM ${tableName}
      WHERE id IN (
          SELECT id FROM CTE WHERE row_num > 1
      );
    `;
    await this.db.client.queryObject(sql);
  }
}
