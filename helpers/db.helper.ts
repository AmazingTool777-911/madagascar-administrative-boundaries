import { DbType } from "@scope/consts/db";
import type {
  DbTransactionContext,
  PostgresTransactionContext,
  SQLiteTransactionContext,
} from "@scope/types/db";

/**
 * Ensures the given transaction context is a PostgresTransactionContext.
 * Throws an error if the context is present but has a different database type.
 *
 * @param transactionContext - The database transaction context to validate.
 * @returns True if the transaction context is a PostgresTransactionContext.
 * @throws Error if the transaction context exists but is not for a Postgres database.
 */
export function ensureIsPostgresDbTransactionCtx(
  transactionContext?: DbTransactionContext,
): transactionContext is PostgresTransactionContext {
  if (transactionContext) {
    if (transactionContext.dbType !== DbType.Postgres) {
      throw new Error(
        `Transaction context type (${transactionContext.dbType}) does not match database type (${DbType.Postgres})`,
      );
    }
    return true;
  }
  return false;
}

/**
 * Ensures the given transaction context is a SQLiteTransactionContext.
 * Throws an error if the context is present but has a different database type.
 *
 * @param transactionContext - The database transaction context to validate.
 * @returns True if the transaction context is a SQLiteTransactionContext.
 * @throws Error if the transaction context exists but is not for a SQLite database.
 */
export function ensureIsSqliteDbTransactionCtx(
  transactionContext?: DbTransactionContext,
): transactionContext is SQLiteTransactionContext {
  if (transactionContext) {
    if (transactionContext.dbType !== DbType.SQLite) {
      throw new Error(
        `Transaction context type (${transactionContext.dbType}) does not match database type (${DbType.SQLite})`,
      );
    }
    return true;
  }
  return false;
}
