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
  /** Environment variable mapped for --pg.url. */
  pgUrl?: string;
  /** Environment variable mapped for --pg.host. */
  pgHost?: string;
  /** Environment variable mapped for --pg.port. */
  pgPort?: number;
  /** Environment variable mapped for --pg.user. */
  pgUser?: string;
  /** Environment variable mapped for --pg.password. */
  pgPassword?: string;
  /** Environment variable mapped for --pg.database. */
  pgDatabase?: string;
  /** Environment variable mapped for --pg.schema. */
  pgSchema?: string;
  /** Environment variable mapped for --pg.ssl. */
  pgSsl?: boolean;
  /** Environment variable mapped for --pg.ca-cert-file. */
  pgCaCertFile?: string;
  /** Environment variable mapped for --pg.ca-cert-path. */
  pgCaCertPath?: string;
  /** Environment variable mapped for --disable-redis. */
  disableRedisEnv?: boolean;
  /** Environment variable mapped for --redis.url. */
  redisUrl?: string;
  /** Environment variable mapped for --redis.host. */
  redisHost?: string;
  /** Environment variable mapped for --redis.port. */
  redisPort?: number;
  /** Environment variable mapped for --redis.username. */
  redisUsername?: string;
  /** Environment variable mapped for --redis.password. */
  redisPassword?: string;
  /** Environment variable mapped for --redis.db. */
  redisDb?: number;
  /** Environment variable mapped for --redis.ssl. */
  redisSsl?: boolean;
};

export type GlobalCliConfig = Pick<
  CliConfig,
  "dbType" | "pg" | "disableRedis" | "redis"
>;

/**
 * A comprehensive configuration object encompassing all possible connection values
 * grouped by database type, typically parsed from CLI arguments or environment variables.
 */
export type DbConnectionCliConfig = Pick<CliConfig, "dbType" | "pg">;

/**
 * Extra options passed to database DDL injectors.
 */
export interface DbDDLExtraOptionsCliConfig {
  /** The PostgreSQL schema to use for the table. */
  pgSchema?: string;
}
