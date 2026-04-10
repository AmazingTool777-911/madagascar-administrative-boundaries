import { parseArgs } from "@std/cli";
import { injectPostgresDbConnection } from "@scope/adapters/postgres";
import { injectRedisConnection } from "@scope/redis";
import { DbType } from "@scope/consts/db";
import { CliArgsEnvResolvers } from "@scope/helpers";

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

const pg = injectPostgresDbConnection();
const redis = injectRedisConnection();

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

  // 4. Optionally Establish Redis Connection
  if (!redisCliArgs.disableRedis) {
    if (redisCliArgs.url) {
      console.log("\nConnecting to Redis via URL...");
      console.log(`  URL : ${redisCliArgs.url}`);
      await redis.connect(redisCliArgs.url);
    } else {
      console.log("\nConnecting to Redis via config...");
      console.log(`  Host : ${redisCliArgs.host}`);
      console.log(`  Port : ${redisCliArgs.port}`);
      if (redisCliArgs.username) {
        console.log(`  User : ${redisCliArgs.username}`);
      }
      console.log(`  DB   : ${redisCliArgs.db}`);
      console.log(`  SSL  : ${redisCliArgs.ssl ?? "false"}`);

      await redis.connect({
        host: redisCliArgs.host,
        port: redisCliArgs.port,
        username: redisCliArgs.username,
        password: redisCliArgs.password,
        db: redisCliArgs.db,
        ssl: redisCliArgs.ssl,
      });
    }
    console.log("✅ Redis connection successful.");
  } else {
    console.log("\nℹ️  Redis connection disabled. Skipping...");
  }

  // Business Logic placeholder
  console.log("\n🚀 Proceeding with extracting ADM inputs...");
} catch (err) {
  console.error(`\n❌ Fatal Error: ${(err as Error).message}`);
  Deno.exit(1);
} finally {
  await pg.close();
  redis.close();
  console.log("\n👋 Connections closed.");
}
