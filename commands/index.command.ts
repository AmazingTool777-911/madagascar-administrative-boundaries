import { Command } from "@cliffy/command";
import { colors } from "@cliffy/ansi/colors";
import {
  CLI_DESCRIPTION,
  CLI_NAME,
  CLI_VERSION,
  DB_TYPE_DESCRIPTION,
  DISABLE_REDIS_DESCRIPTION,
  PG_CA_CERT_FILE_DESCRIPTION,
  PG_CA_CERT_PATH_DESCRIPTION,
  PG_DATABASE_DESCRIPTION,
  PG_HOST_DESCRIPTION,
  PG_PASSWORD_DESCRIPTION,
  PG_PORT_DESCRIPTION,
  PG_SCHEMA_DESCRIPTION,
  PG_SSL_DESCRIPTION,
  PG_URL_DESCRIPTION,
  PG_USER_DESCRIPTION,
  REDIS_DB_DESCRIPTION,
  REDIS_HOST_DESCRIPTION,
  REDIS_PASSWORD_DESCRIPTION,
  REDIS_PORT_DESCRIPTION,
  REDIS_SSL_DESCRIPTION,
  REDIS_URL_DESCRIPTION,
  REDIS_USERNAME_DESCRIPTION,
} from "@scope/consts/cli";
import { DbType } from "@scope/consts/db";
import {
  type CliConfig,
  type GlobalCliConfig,
  type PostgresDbConnectionCliConfig,
  type RedisDbConnectionCliConfig,
} from "@scope/types/cli";
import { attemptDbConnection, injectDbConnection } from "@scope/db";
import { injectRedisConnection } from "@scope/redis";

/**
 * The root CLI command for the administrative data pipeline.
 * Responsible for parsing global database connection arguments,
 * merging CLI flags with environment variables, and initializing
 * the appropriate database adapter.
 */
export class CliIndexCommand extends Command<void, void, CliConfig> {
  /**
   * Initializes the root CLI command with global options and environment
   * variable mappings for database configuration.
   */
  constructor() {
    super();
    this.name(CLI_NAME)
      .version(CLI_VERSION)
      .description(CLI_DESCRIPTION)
      .globalOption("--db-type <type:string>", DB_TYPE_DESCRIPTION, {
        default: DbType.SQLite,
      })
      .globalOption("--pg.schema <schema:string>", PG_SCHEMA_DESCRIPTION, {
        default: "public",
      })
      .globalOption("--pg.url <url:string>", PG_URL_DESCRIPTION)
      .globalOption("--pg.host <host:string>", PG_HOST_DESCRIPTION, {
        default: "localhost",
      })
      .globalOption("--pg.port <port:number>", PG_PORT_DESCRIPTION, {
        default: 5432,
        depends: ["--pg.host"],
      })
      .globalOption("--pg.user <username:string>", PG_USER_DESCRIPTION, {
        default: "postgres",
        depends: ["--pg.host"],
      })
      .globalOption(
        "--pg.password <password:string>",
        PG_PASSWORD_DESCRIPTION,
        {
          depends: ["--pg.user"],
          default: "",
        },
      )
      .globalOption(
        "--pg.database <database:string>",
        PG_DATABASE_DESCRIPTION,
        {
          depends: ["--pg.user"],
          default: "postgres",
        },
      )
      .globalOption("--pg.ssl <ssl:boolean>", PG_SSL_DESCRIPTION, {
        default: false,
        depends: ["--pg.user"],
      })
      .globalOption(
        "--pg.ca-cert-file <filename:string>",
        PG_CA_CERT_FILE_DESCRIPTION,
        {
          depends: ["--pg.ssl"],
        },
      )
      .globalOption(
        "--pg.ca-cert-path <path:string>",
        PG_CA_CERT_PATH_DESCRIPTION,
        {
          depends: ["--pg.ssl"],
        },
      )
      .globalOption(
        "--disable-redis <disabled:boolean>",
        DISABLE_REDIS_DESCRIPTION,
        {
          default: false,
        },
      )
      .globalOption("--redis.url <url:string>", REDIS_URL_DESCRIPTION)
      .globalOption("--redis.host <host:string>", REDIS_HOST_DESCRIPTION, {
        default: "localhost",
      })
      .globalOption("--redis.port <port:number>", REDIS_PORT_DESCRIPTION, {
        default: 6379,
      })
      .globalOption(
        "--redis.user <username:string>",
        REDIS_USERNAME_DESCRIPTION,
      )
      .globalOption(
        "--redis.password <password:string>",
        REDIS_PASSWORD_DESCRIPTION,
      )
      .globalOption("--redis.db <db:number>", REDIS_DB_DESCRIPTION)
      .globalOption("--redis.ssl <ssl:boolean>", REDIS_SSL_DESCRIPTION, {
        default: false,
      })
      .globalEnv("DB_TYPE=<type:string>", DB_TYPE_DESCRIPTION)
      .globalEnv("PG_URL=<url:string>", PG_URL_DESCRIPTION)
      .globalEnv("PG_HOST=<host:string>", PG_HOST_DESCRIPTION)
      .globalEnv("PG_PORT=<port:number>", PG_PORT_DESCRIPTION)
      .globalEnv("PG_USER=<user:string>", PG_USER_DESCRIPTION)
      .globalEnv("PG_PASSWORD=<password:string>", PG_PASSWORD_DESCRIPTION)
      .globalEnv("PG_DATABASE=<database:string>", PG_DATABASE_DESCRIPTION)
      .globalEnv("PG_SCHEMA=<schema:string>", PG_SCHEMA_DESCRIPTION)
      .globalEnv("PG_SSL=<ssl:boolean>", PG_SSL_DESCRIPTION)
      .globalEnv("PG_CA_CERT_FILE=<file:string>", PG_CA_CERT_FILE_DESCRIPTION)
      .globalEnv("PG_CA_CERT_PATH=<path:string>", PG_CA_CERT_PATH_DESCRIPTION)
      .globalEnv("DISABLE_REDIS=<disabled:boolean>", DISABLE_REDIS_DESCRIPTION)
      .globalEnv("REDIS_URL=<url:string>", REDIS_URL_DESCRIPTION)
      .globalEnv("REDIS_HOST=<host:string>", REDIS_HOST_DESCRIPTION)
      .globalEnv("REDIS_PORT=<port:number>", REDIS_PORT_DESCRIPTION)
      .globalEnv("REDIS_USERNAME=<user:string>", REDIS_USERNAME_DESCRIPTION)
      .globalEnv("REDIS_PASSWORD=<password:string>", REDIS_PASSWORD_DESCRIPTION)
      .globalEnv("REDIS_DB=<db:number>", REDIS_DB_DESCRIPTION)
      .globalEnv("REDIS_SSL=<ssl:boolean>", REDIS_SSL_DESCRIPTION)
      .globalAction(async (args) => {
        const pg: PostgresDbConnectionCliConfig = {
          url: args.pg?.url ?? args.pgUrl,
          host: args.pg?.host ?? args.pgHost,
          port: args.pg?.port ?? args.pgPort,
          user: args.pg?.user ?? args.pgUser,
          password: args.pg?.password ?? args.pgPassword,
          database: args.pg?.database ?? args.pgDatabase,
          schema: args.pg?.schema ?? args.pgSchema,
          ssl: args.pg?.ssl ?? args.pgSsl,
          caCertFile: args.pg?.caCertFile ?? args.pgCaCertFile,
          caCertPath: args.pg?.caCertPath ?? args.pgCaCertPath,
        };

        const redis: RedisDbConnectionCliConfig = {
          url: args.redis?.url ?? args.redisUrl,
          host: args.redis?.host ?? args.redisHost,
          port: args.redis?.port ?? args.redisPort,
          user: args.redis?.user ?? args.redisUsername,
          password: args.redis?.password ?? args.redisPassword,
          db: args.redis?.db ?? args.redisDb,
          ssl: args.redis?.ssl ?? args.redisSsl,
        };

        await this.handleGlobalAction({
          dbType: args.dbType as unknown as DbType,
          disableRedis: (args.disableRedis ?? args.disableRedisEnv) as boolean,
          pg,
          redis,
        });
      })
      .action(async (args) => {
        await this.handleIndexAction(args as unknown as CliConfig);
      });
  }

  /**
   * Internal handler executed when the global CLI command runs.
   * Instantiates and connects to the database based on the resolved configuration.
   *
   * @param args The globally resolved CLI and environment configurations.
   */
  private async handleGlobalAction(args: GlobalCliConfig) {
    console.log(
      colors.blue.bold(`\n🚀 Initializing Administrative Data Pipeline`),
    );
    console.log(colors.gray(`   Database Type: ${args.dbType}`));
    if (args.dbType === DbType.Postgres && args.pg) {
      console.log(
        colors.gray(`   PostgreSQL Host: ${args.pg.host}:${args.pg.port}`),
      );
      console.log(colors.gray(`   PostgreSQL User: ${args.pg.user}`));
      console.log(colors.gray(`   Target Database: ${args.pg.database}`));
    }

    const db = injectDbConnection(args.dbType);

    console.log(colors.blue(`\n🔌 Establishing database connection...`));
    await attemptDbConnection(db, {
      dbType: args.dbType,
      pg: args.pg,
    });
    console.log(
      colors.green.bold(`✅ Database connection established successfully!\n`),
    );
  }

  private async handleIndexAction(args: CliConfig) {
    if (!args.disableRedis && args.redis) {
      const redis = injectRedisConnection();
      console.log(colors.blue(`🔌 Establishing Redis connection...`));
      console.log(
        colors.gray(`   Redis Host: ${args.redis.host}:${args.redis.port}`),
      );

      await redis.connect(
        args.redis.url || {
          host: args.redis.host,
          port: args.redis.port,
          username: args.redis.user,
          password: args.redis.password,
          db: args.redis.db,
          ssl: args.redis.ssl,
        },
      );
      console.log(
        colors.green.bold(`✅ Redis connection established successfully!\n`),
      );
    }
  }
}

let _cliIndexCommand!: CliIndexCommand;

/**
 * Injects and manages a singleton instance of the CliIndexCommand.
 *
 * @returns The singleton instance of the CLI root command.
 */
export function injectCliIndexCommand() {
  if (!_cliIndexCommand) {
    _cliIndexCommand = new CliIndexCommand();
  }
  return _cliIndexCommand;
}
