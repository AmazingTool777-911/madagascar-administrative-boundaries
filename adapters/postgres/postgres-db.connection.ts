import { Client } from "@db/postgres";
import type { DbConnection, DbConnectionParams } from "@scope/types/db";
import type { MaybePromise } from "@scope/types/utils";
import { DbType } from "@scope/consts/db";

/**
 * Implementation of a database connection specifically for PostgreSQL.
 * It manages the underlying PostgreSQL client and provides transaction support.
 */
export class PostgresDbConnection implements DbConnection {
  /** The native PostgreSQL client instance. */
  #client: Client | null = null;

  /**
   * Native getter for the PostgreSQL client.
   *
   * @returns The active PostgreSQL client.
   * @throws {Error} If the client has not been initialized through a call to {@link connect}.
   */
  get client(): Client {
    if (!this.#client) {
      throw new Error(
        "PostgreSQL client has not been initialized. Call connect() first.",
      );
    }
    return this.#client;
  }

  /**
   * Establishes a connection to a PostgreSQL database.
   * Supports re-initialization by closing any existing connection before creating a new one.
   *
   * @param params - The connection parameters, including database type and connection details.
   * @throws {Error} If the provided database type is not PostgreSQL.
   */
  async connect(params: DbConnectionParams): Promise<void> {
    if (params.dbType !== DbType.Postgres) {
      throw new Error(
        `Unsupported database type: ${params.dbType}. Expected ${DbType.Postgres}.`,
      );
    }

    // Support re-initialization by ending existing client session if it exists
    if (this.#client) {
      await this.#client.end();
    }

    if (typeof params.connection === "string") {
      this.#client = new Client(params.connection);
    } else {
      const config = params.connection;
      this.#client = new Client({
        hostname: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        tls: {
          enabled: config.ssl ?? true,
          enforce: config.ssl ?? false,
        },
      });
    }

    await this.#client.connect();
  }

  /**
   * Closes the active PostgreSQL connection.
   * If no connection is active, this method does nothing.
   */
  async close(): Promise<void> {
    if (this.#client) {
      await this.#client.end();
      this.#client = null;
    }
  }

  /**
   * Executes a callback function within a PostgreSQL transaction.
   * Handles automatic BEGIN, COMMIT, and ROLLBACK operations.
   *
   * @param callback - The asynchronous function to execute within the transaction.
   * @returns The resolved value of the callback function.
   * @throws {Error} If the transaction fails or the callback throws an error.
   */
  async transaction<T>(callback: () => MaybePromise<T>): Promise<T> {
    const transaction = this.client.createTransaction("postgres_tx");

    try {
      await transaction.begin();
      const result = await callback();
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

let _instance: PostgresDbConnection | null = null;

/**
 * Injects (or creates if necessary) the singleton instance of {@link PostgresDbConnection}.
 *
 * @returns The singleton instance of the PostgreSQL database connection.
 */
export function injectPostgresDbConnection(): PostgresDbConnection {
  if (!_instance) {
    _instance = new PostgresDbConnection();
  }
  return _instance;
}
