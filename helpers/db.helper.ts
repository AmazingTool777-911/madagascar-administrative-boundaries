import { DbType } from "@scope/consts/db";
import type {
  DbTransactionContext,
  PostgresTransactionContext,
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
