import {
  type DbType,
  DEFAULT_DB_TYPE,
  DEFAULT_PG_SCHEMA,
} from "@scope/consts/db";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_WORKER_JOB_HWM,
} from "@scope/lib/in-memory-workers-mediators";
import {
  DEFAULT_HEALTHCHECK_INTERVAL,
  DEFAULT_PENDING_MIN_DURATION_THRESHOLD,
  DEFAULT_XREAD_BLOCK_DURATION,
} from "@scope/lib/redis-workers-mediators";
import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_PROCESSING_WORKERS_COUNT,
} from "@scope/lib/workers-mediators";
import type {
  GlobalCliConfig,
  GlobalCliConfigResolved,
  IndexActionCliConfig,
  IndexActionCliConfigResolved,
} from "@scope/types/cli";

/**
 * Resolves the raw global CLI configuration into a fully-typed, default-applied
 * resolved configuration.
 *
 * Resolution priority for each field: CLI flag → env-var shadow key → hardcoded default.
 *
 * @param args - The raw global CLI config as populated by Cliffy.
 * @returns A fully resolved global CLI configuration with no `undefined` values for
 *   defaulted fields.
 */
export function resolveGlobalCliConfig(
  args: GlobalCliConfig,
): GlobalCliConfigResolved {
  return {
    dbType: (args.dbType ?? DEFAULT_DB_TYPE) as DbType,
    cliDebug: !!(args.cliDebug ?? false),
    pgSchema: args.pg?.schema ?? args.pgSchema ?? DEFAULT_PG_SCHEMA,
    pg: {
      url: args.pg?.url ?? args.pgUrl,
      host: args.pg?.host ?? args.pgHost ?? "localhost",
      port: args.pg?.port ?? args.pgPort ?? 5432,
      user: args.pg?.user ?? args.pgUser ?? "postgres",
      password: args.pg?.password ?? args.pgPassword ?? "",
      database: args.pg?.database ?? args.pgDatabase ?? "postgres",
      ssl: args.pg?.ssl ?? args.pgSsl ?? false,
      caCertFile: args.pg?.caCertFile ?? args.pgCaCertFile,
      caCertPath: args.pg?.caCertPath ?? args.pgCaCertPath,
    },
    sqlite: {
      dbFile: args.sqlite?.dbFile ?? args.sqliteDbFile,
      dbPath: args.sqlite?.dbPath ?? args.sqliteDbPath,
    },
  };
}

/**
 * Resolves the raw index-action CLI configuration into a fully-typed,
 * default-applied resolved configuration.
 *
 * Resolution priority for each field: CLI flag → env-var shadow key → hardcoded default.
 * The full `pg` block is not carried over — only `pgSchema` is preserved, since
 * the database connection was already established by the global action handler.
 *
 * @param args - The raw index-action CLI config as populated by Cliffy.
 * @returns A fully resolved index-action CLI configuration with no `undefined`
 *   values for defaulted fields.
 */
export function resolveIndexCliConfig(
  args: IndexActionCliConfig,
): IndexActionCliConfigResolved {
  const global = resolveGlobalCliConfig(args);
  return {
    dbType: global.dbType,
    cliDebug: global.cliDebug,
    pgSchema: global.pgSchema,
    sqlite: global.sqlite,
    disableRedis: !!(args.disableRedis ?? false),
    redis: {
      url: args.redis?.url ?? args.redisUrl,
      host: args.redis?.host ?? args.redisHost ?? "localhost",
      port: args.redis?.port ?? args.redisPort ?? 6379,
      user: args.redis?.user ?? args.redisUsername,
      password: args.redis?.password ?? args.redisPassword,
      db: args.redis?.db ?? args.redisDb,
      ssl: args.redis?.ssl ?? args.redisSsl ?? false,
      certFile: args.redis?.certFile ?? args.redisCertFile,
      certPath: args.redis?.certPath ?? args.redisCertPath,
      keyFile: args.redis?.keyFile ?? args.redisKeyFile,
      keyPath: args.redis?.keyPath ?? args.redisKeyPath,
      caCertFile: args.redis?.caCertFile ?? args.redisCaCertFile,
      caCertPath: args.redis?.caCertPath ?? args.redisCaCertPath,
    },
    queueBatchSize: args.queueBatchSize ?? DEFAULT_BATCH_SIZE,
    queueMaxRetries: args.queueMaxRetries ?? DEFAULT_MAX_RETRIES,
    inMemoryProcessingHwm: args.inMemoryProcessingHwm ?? DEFAULT_WORKER_JOB_HWM,
    inMemoryInsertHwm: args.inMemoryInsertHwm ?? DEFAULT_WORKER_JOB_HWM,
    workerHealthcheckInterval: args.workerHealthcheckInterval ??
      DEFAULT_HEALTHCHECK_INTERVAL,
    workerPendingMinDurationThreshold: args.workerPendingMinDurationThreshold ??
      DEFAULT_PENDING_MIN_DURATION_THRESHOLD,
    xreadBlockDuration: args.xreadBlockDuration ?? DEFAULT_XREAD_BLOCK_DURATION,
    processingWorkersCount: args.processingWorkersCount ??
      DEFAULT_PROCESSING_WORKERS_COUNT,
  };
}
