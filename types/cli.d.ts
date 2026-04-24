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
  /**
   * Filename of the client certificate located under the shared
   * `redis/.ca-certificates/` directory.
   */
  certFile?: string;
  /** Full path to the client certificate file. */
  certPath?: string;
  /**
   * Filename of the client key located under the shared
   * `redis/.ca-certificates/` directory.
   */
  keyFile?: string;
  /** Full path to the client key file. */
  keyPath?: string;
  /**
   * Filename of the CA certificate located under the shared
   * `redis/.ca-certificates/` directory.
   */
  caCertFile?: string;
  /** Full path to the CA certificate file. */
  caCertPath?: string;
}

/**
 * Full CLI configuration encompassing all global and command-scoped options.
 */
export type CliConfig = {
  /** The target database type. */
  dbType: DbType;
  /** Whether to enable debug logging across the pipeline. */
  debug: boolean;
  /** Configuration specific to PostgreSQL. */
  pg: PostgresDbConnectionCliConfig;
  /** Whether to skip the Redis connection. Defaults to false. */
  disableRedis: boolean;
  /** Configuration specific to Redis. */
  redis: RedisDbConnectionCliConfig;
  /** Batch size for processing messages concurrently. */
  queueBatchSize?: number;
  /** Maximum number of retries per batch in case of an error. */
  queueMaxRetries?: number;
  /** Default high water mark for in-memory processing workers. */
  inMemoryProcessingHwm?: number;
  /** Default high water mark for the in-memory insert worker. */
  inMemoryInsertHwm?: number;
  /** Interval for worker healthcheck in milliseconds. */
  workerHealthcheckInterval?: number;
  /** Threshold for claiming pending messages in milliseconds. */
  workerPendingMinDurationThreshold?: number;
  /** Duration in milliseconds for XREAD BLOCK calls in Redis. */
  xreadBlockDuration?: number;
  /** Number of concurrent processing workers to spawn per ADM level. */
  processingWorkersCount: number;

  // ── Environment variable mappings (populated by Cliffy) ──────────────────

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
  /** Environment variable mapped for --redis.cert-file. */
  redisCertFile?: string;
  /** Environment variable mapped for --redis.cert-path. */
  redisCertPath?: string;
  /** Environment variable mapped for --redis.key-file. */
  redisKeyFile?: string;
  /** Environment variable mapped for --redis.key-path. */
  redisKeyPath?: string;
  /** Environment variable mapped for --redis.ca-cert-file. */
  redisCaCertFile?: string;
  /** Environment variable mapped for --redis.ca-cert-path. */
  redisCaCertPath?: string;
};

/**
 * Subset of CliConfig representing the globally resolved configuration,
 * available to all commands including subcommands.
 */
export type GlobalCliConfig = Pick<CliConfig, "dbType" | "pg" | "debug">;

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
