import type { DbType } from "@scope/consts/db";

/**
 * PostgreSQL configuration options derived from CLI or environment variables.
 */
export interface PostgresDbConnectionCliConfig {
  /** Full PostgreSQL connection URL. When set, individual config fields are ignored. */
  url?: string;
  /** Hostname or IP address of the PostgreSQL server. */
  host: string;
  /** TCP port the PostgreSQL server listens on. */
  port: number;
  /** Username to authenticate with. */
  user: string;
  /** Password for the database user. */
  password: string;
  /** Name of the target database. */
  database: string;
  /** The physical database schema name. */
  schema: string;
  /** Whether to enable SSL for the connection. */
  ssl: boolean;
  /**
   * Filename of a CA certificate located under the shared `db/.ca-certificates/`
   * directory. Takes precedence over `caCertPath` when both are provided.
   * Only used when `ssl` is `true`.
   */
  caCertFile?: string;
  /**
   * Full pathname to the CA certificate file.
   * Only used when `ssl` is `true` and `caCertFile` is not set.
   */
  caCertPath?: string;
}

/**
 * Redis configuration options derived from CLI or environment variables.
 */
export interface RedisDbConnectionCliConfig {
  /** Full Redis connection URL. */
  url?: string;
  /** Hostname or IP address of the Redis server. */
  host: string;
  /** Port the Redis server listens on. */
  port: number;
  /** Optional username for Redis authentication. */
  user?: string;
  /** Optional password for Redis authentication. */
  password?: string;
  /** Optional database index to select after connection. */
  db?: number;
  /** Whether to use TLS for the connection. */
  ssl: boolean;
}

export type CliConfig = {
  /** The target database type. */
  dbType: DbType;
  /** Whether to skip the Redis connection. Defaults to false. */
  disableRedis: boolean;
  /** Configuration specific to PostgreSQL. */
  pg: PostgresDbConnectionCliConfig;
  /** Configuration specific to Redis. */
  redis?: RedisDbConnectionCliConfig;

  // Environment variables mapped by Cliffy
  pgUrl?: string;
  pgHost?: string;
  pgPort?: number;
  pgUser?: string;
  pgPassword?: string;
  pgDatabase?: string;
  pgSchema?: string;
  pgSsl?: boolean;
  pgCaCertFile?: string;
  pgCaCertPath?: string;
};

export type GlobalCliConfig = Pick<CliConfig, "dbType" | "pg">;

/**
 * A comprehensive configuration object encompassing all possible connection values
 * grouped by database type, typically parsed from CLI arguments or environment variables.
 */
export type DbConnectionCliConfig = Pick<CliConfig, "dbType" | "pg">;
