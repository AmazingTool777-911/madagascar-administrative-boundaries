import {
  injectPostgresDbConnection,
  PostgresDbConnection,
} from "../adapters/postgres/postgres-db.connection.ts";
import { DbType } from "@scope/consts/db";
import type { DbConnection, DbConnectionParams } from "@scope/types/db";
import type { DbConnectionCliConfig } from "@scope/types/cli";

/**
 * Injects a database connection instance based on the specified database type.
 *
 * @param dbType - The type of database connection to inject.
 * @returns The singleton instance of the appropriate DbConnection.
 * @throws {Error} If the requested database type is not supported.
 */
export function injectDbConnection(dbType: DbType): DbConnection {
  switch (dbType) {
    case DbType.Postgres:
      return injectPostgresDbConnection();
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

/**
 * Attempts to connect a database using the provided connection instance and parameters.
 * Validates that the underlying connection instance matches the required database type
 * specified in the parameters.
 *
 * @param connection - The database connection instance.
 * @param config - The database configuration from CLI arguments or environment variables.
 * @returns A promise that resolves when the connection is successfully established.
 * @throws {Error} If the connection instance is not of the expected class for the provided database type.
 */
export async function attemptDbConnection(
  connection: DbConnection,
  config: DbConnectionCliConfig,
): Promise<void> {
  let params!: DbConnectionParams;

  switch (config.dbType) {
    case DbType.Postgres: {
      if (!(connection instanceof PostgresDbConnection)) {
        throw new Error(
          "Invalid connection instance: Expected PostgresDbConnection for PostgreSQL database type.",
        );
      }
      const pg = config.pg;
      params = {
        dbType: DbType.Postgres,
        connection: pg.url
          ? pg.url
          : {
              host: pg.host,
              port: pg.port,
              username: pg.user,
              password: pg.password,
              database: pg.database,
              ssl: pg.ssl,
              caCertFile: pg.ssl ? pg.caCertFile : undefined,
              caCertPath: pg.ssl ? pg.caCertPath : undefined,
            },
      };
      break;
    }
    default:
      throw new Error(`Unsupported database type: ${config.dbType}`);
  }

  await connection.connect(params);
}
