import { parseArgs } from "@std/cli";
import { injectRedisConnection } from "@scope/redis";
import {
  InMemory,
  type QueueWorkersMediator,
  Redis,
} from "@scope/lib/workers-mediators";
import { DbType } from "@scope/consts/db";
import { CliArgsEnvResolvers } from "@scope/helpers";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { TableDDL } from "@scope/types/db";
import {
  injectCommunesPostgresDDL,
  injectDistrictsPostgresDDL,
  injectFokontanysPostgresDDL,
  injectMadaAdmConfigPostgresDDL,
  injectPostgresDbConnection,
  injectProvincesPostgresDDL,
  injectRegionsPostgresDDL,
} from "@scope/adapters/postgres";

/**
 * Parsed CLI arguments for the PostgreSQL connection.
 */
interface PostgresCliArgs {
  /** Connection URL for PostgreSQL. */
  url?: string;
  /** Hostname or IP address of the Postgres server. */
  host: string;
  /** Port the Postgres server listens on. */
  port: number;
  /** Username for Postgres authentication. */
  username: string;
  /** Password for Postgres authentication. */
  password: string;
  /** Name of the database to connect to. */
  database: string;
  /** Whether to enable SSL for the connection. */
  ssl?: boolean;
}

/**
 * Parsed CLI arguments for the Redis connection.
 */
interface RedisCliArgs {
  /** Whether to skip the Redis connection. Defaults to false. */
  disableRedis: boolean;
  /** Connection URL for Redis. */
  url?: string;
  /** Hostname or IP address of the Redis server. */
  host: string;
  /** Port the Redis server listens on. */
  port: number;
  /** Optional username for Redis authentication. */
  username?: string;
  /** Optional password for Redis authentication. */
  password?: string;
  /** Optional database index to select after connection. */
  db?: number;
  /** Whether to use TLS for the connection. */
  ssl?: boolean;
}

/**
 * Parsed CLI arguments for the worker mediators configuration.
 */
interface MediatorCliArgs {
  queueBatchSize?: number;
  queueMaxRetries?: number;
  inMemoryProcessingHwm?: number;
  inMemoryInsertHwm?: number;
  workerHealthcheckInterval?: number;
  workerPendingMinDurationThreshold?: number;
}

const args = parseArgs(Deno.args, {
  string: [
    "url",
    "host",
    "username",
    "password",
    "database",
    "redis-url",
    "redis-host",
    "redis-username",
    "redis-password",
    "queue-batch-size",
    "queue-max-retries",
    "in-memory-processing-hwm",
    "in-memory-insert-hwm",
    "worker-healthcheck-interval",
    "worker-pending-min-duration-threshold",
  ],
  boolean: ["ssl", "disable-redis", "redis-ssl"],
  default: {},
});

// 1. Resolve PostgreSQL Parameters
const pgParams: PostgresCliArgs = {
  url: CliArgsEnvResolvers.resolveOptionalString(args["url"], "PG_URL"),
  host: CliArgsEnvResolvers.resolveString(args["host"], "PG_HOST", "localhost"),
  port: CliArgsEnvResolvers.resolveNumber(
    args["port"] as number | undefined,
    "PG_PORT",
    5432,
  ),
  username: CliArgsEnvResolvers.resolveString(
    args["username"],
    "PG_USERNAME",
    "postgres",
  ),
  password: CliArgsEnvResolvers.resolveString(
    args["password"],
    "PG_PASSWORD",
    "",
  ),
  database: CliArgsEnvResolvers.resolveString(
    args["database"],
    "PG_DATABASE",
    "postgres",
  ),
  ssl: CliArgsEnvResolvers.resolveBoolean(
    args["ssl"] as boolean | undefined,
    "PG_SSL",
  ),
};

// 2. Resolve Redis Parameters
const redisCliArgs: RedisCliArgs = {
  disableRedis: !!CliArgsEnvResolvers.resolveBoolean(
    args["disable-redis"] as boolean | undefined,
    "DISABLE_REDIS",
  ),
  url: CliArgsEnvResolvers.resolveOptionalString(
    args["redis-url"],
    "REDIS_URL",
  ),
  host: CliArgsEnvResolvers.resolveString(
    args["redis-host"],
    "REDIS_HOST",
    "localhost",
  ),
  port: CliArgsEnvResolvers.resolveNumber(
    args["redis-port"] as number | undefined,
    "REDIS_PORT",
    6379,
  ),
  username: CliArgsEnvResolvers.resolveOptionalString(
    args["redis-username"],
    "REDIS_USERNAME",
  ),
  password: CliArgsEnvResolvers.resolveOptionalString(
    args["redis-password"],
    "REDIS_PASSWORD",
  ),
  db: CliArgsEnvResolvers.resolveNumber(
    args["redis-db"] as number | undefined,
    "REDIS_DB",
    0,
  ),
  ssl: CliArgsEnvResolvers.resolveBoolean(
    args["redis-ssl"] as boolean | undefined,
    "REDIS_SSL",
  ),
};

// 3. Resolve Mediator Parameters
const mediatorCliArgs: MediatorCliArgs = {
  queueBatchSize: CliArgsEnvResolvers.resolveOptionalNumber(
    args["queue-batch-size"] as number | undefined,
    "QUEUE_BATCH_SIZE",
  ),
  queueMaxRetries: CliArgsEnvResolvers.resolveOptionalNumber(
    args["queue-max-retries"] as number | undefined,
    "QUEUE_MAX_RETRIES",
  ),
  inMemoryProcessingHwm: CliArgsEnvResolvers.resolveOptionalNumber(
    args["in-memory-processing-hwm"] as number | undefined,
    "IN_MEMORY_PROCESSING_HWM",
  ),
  inMemoryInsertHwm: CliArgsEnvResolvers.resolveOptionalNumber(
    args["in-memory-insert-hwm"] as number | undefined,
    "IN_MEMORY_INSERT_HWM",
  ),
  workerHealthcheckInterval: CliArgsEnvResolvers.resolveOptionalNumber(
    args["worker-healthcheck-interval"] as number | undefined,
    "WORKER_HEALTHCHECK_INTERVAL",
  ),
  workerPendingMinDurationThreshold: CliArgsEnvResolvers.resolveOptionalNumber(
    args["worker-pending-min-duration-threshold"] as number | undefined,
    "WORKER_PENDING_MIN_DURATION_THRESHOLD",
  ),
};

const pg = injectPostgresDbConnection();
const redis = injectRedisConnection();

const config: MadaAdmConfigValues = {
  tablesPrefix: "extract_adm",
  isFkRepeated: false,
  isProvinceRepeated: true,
  isProvinceFkRepeated: false,
  hasGeojson: true,
  hasAdmLevel: false,
};

try {
  // 3. Establish PostgreSQL Connection
  if (pgParams.url) {
    console.log("Connecting to PostgreSQL database via URL...");
    console.log(`  URL : ${pgParams.url}`);
    await pg.connect({ dbType: DbType.Postgres, connection: pgParams.url });
  } else {
    console.log("Connecting to PostgreSQL database via config...");
    console.log(`  Host     : ${pgParams.host}`);
    console.log(`  Port     : ${pgParams.port}`);
    console.log(`  User     : ${pgParams.username}`);
    console.log(`  Database : ${pgParams.database}`);
    console.log(`  SSL      : ${pgParams.ssl ?? "false"}`);

    await pg.connect({
      dbType: DbType.Postgres,
      connection: {
        host: pgParams.host,
        port: pgParams.port,
        username: pgParams.username,
        password: pgParams.password,
        database: pgParams.database,
        ssl: pgParams.ssl,
      },
    });
  }
  console.log("✅ PostgreSQL connection successful.");

  // Ensure PostGIS extension is enabled for spatial data support
  console.log("  Enabling PostGIS extension...");
  await pg.client.queryObject("CREATE EXTENSION IF NOT EXISTS postgis;");

  // deno-lint-ignore no-unused-vars -- Set up for upcoming business logic
  let mediator: QueueWorkersMediator;

  // 4. Optionally Establish Redis Connection
  if (!redisCliArgs.disableRedis) {
    const redisConfig = redisCliArgs.url ? redisCliArgs.url : {
      host: redisCliArgs.host,
      port: redisCliArgs.port,
      username: redisCliArgs.username,
      password: redisCliArgs.password,
      db: redisCliArgs.db,
      ssl: redisCliArgs.ssl,
    };

    if (typeof redisConfig === "string") {
      console.log("\nConnecting to Redis via URL...");
      console.log(`  URL : ${redisConfig}`);
    } else {
      console.log("\nConnecting to Redis via config...");
      console.log(`  Host : ${redisConfig.host}`);
      console.log(`  Port : ${redisConfig.port}`);
      if (redisConfig.username) {
        console.log(`  User : ${redisConfig.username}`);
      }
      console.log(`  DB   : ${redisConfig.db}`);
      console.log(`  SSL  : ${redisConfig.ssl ?? "false"}`);
    }

    await redis.connect(redisConfig);
    console.log("✅ Redis connection successful.");

    mediator = Redis.injectRedisQueueWorkersMediator(
      redis.client!,
      redisConfig,
      {
        processingContextKey: "extract-adm:processing:context",
        processingStreamKey: "extract-adm:processing:stream",
        insertContextKey: "extract-adm:insert:context",
        insertStreamKey: "extract-adm:insert:stream",
        processingConsumerGroupName: "extract-adm:processing-group",
        insertConsumerGroupName: "extract-adm:insert-group",
        persistedLastMessageKey: "extract-adm:persisted-last:message",
        persistedLastInsertMessageKey:
          "extract-adm:persisted-last-insert:message",
        processingDlqStreamKey: "extract-adm:processing:dlq",
        insertDlqStreamKey: "extract-adm:insert:dlq",
        healthcheckInterval: mediatorCliArgs.workerHealthcheckInterval,
        pendingMinDurationThreshold:
          mediatorCliArgs.workerPendingMinDurationThreshold,
      },
    );
    console.log("✅ Redis Queue Workers Mediator initialized.");
  } else {
    console.log("\nℹ️  Redis connection disabled. Skipping...");

    mediator = InMemory.injectInMemoryQueueWorkersMediator({
      processingHwm: mediatorCliArgs.inMemoryProcessingHwm,
      insertHwm: mediatorCliArgs.inMemoryInsertHwm,
    });
    console.log("✅ In-Memory Queue Workers Mediator initialized.");
  }

  // 5. Initialize and create ADM Level tables
  console.log("\n🚀 Proceeding with extracting ADM inputs...");

  const ddls: TableDDL[] = [
    injectMadaAdmConfigPostgresDDL(),
    injectProvincesPostgresDDL(config),
    injectRegionsPostgresDDL(config),
    injectDistrictsPostgresDDL(config),
    injectCommunesPostgresDDL(config),
    injectFokontanysPostgresDDL(config),
  ];

  // Drop tables in reverse order to respect foreign key constraints
  for (const ddl of [...ddls].reverse()) {
    console.log(`  Dropping table: ${ddl.tableName}...`);
    await ddl.drop();
  }

  // Create tables in order Level 0 to 4
  for (const ddl of ddls) {
    console.log(`  Creating table: ${ddl.tableName}...`);
    await ddl.create();
  }
} catch (err) {
  console.error(`\n❌ Fatal Error: ${(err as Error).message}`);
  Deno.exit(1);
} finally {
  await pg.close();
  redis.close();
  console.log("\n👋 Connections closed.");
}
