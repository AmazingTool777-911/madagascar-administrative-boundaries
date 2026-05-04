import * as path from "node:path";
import { DateUtils } from "@scope/utils";
import { Confirm, Input, prompt } from "@cliffy/prompt";
import { Command } from "@cliffy/command";
import { colors } from "@cliffy/ansi/colors";
import { ansi } from "@cliffy/ansi";
import { Table } from "@cliffy/table";
import { injectMadaAdmConfigDDL } from "@scope/db/ddl";
import { injectMadaAdmConfigDML, injectProvincesDML } from "@scope/db/dml";
import {
  CLI_DESCRIPTION,
  CLI_NAME,
  CLI_VERSION,
  DB_TYPE_DESCRIPTION,
  DEBUG_DESCRIPTION,
  DISABLE_REDIS_DESCRIPTION,
  IN_MEMORY_INSERT_HWM_DESCRIPTION,
  IN_MEMORY_PROCESSING_HWM_DESCRIPTION,
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
  PROCESSING_WORKERS_COUNT_DESCRIPTION,
  QUEUE_BATCH_SIZE_DESCRIPTION,
  QUEUE_MAX_RETRIES_DESCRIPTION,
  REDIS_CA_CERT_FILE_DESCRIPTION,
  REDIS_CA_CERT_PATH_DESCRIPTION,
  REDIS_CERT_FILE_DESCRIPTION,
  REDIS_CERT_PATH_DESCRIPTION,
  REDIS_DB_DESCRIPTION,
  REDIS_HOST_DESCRIPTION,
  REDIS_KEY_FILE_DESCRIPTION,
  REDIS_KEY_PATH_DESCRIPTION,
  REDIS_PASSWORD_DESCRIPTION,
  REDIS_PORT_DESCRIPTION,
  REDIS_SSL_DESCRIPTION,
  REDIS_URL_DESCRIPTION,
  REDIS_USERNAME_DESCRIPTION,
  SQLITE_DB_FILE_DESCRIPTION,
  SQLITE_DB_PATH_DESCRIPTION,
  WORKER_HEALTHCHECK_INTERVAL_DESCRIPTION,
  WORKER_PENDING_MIN_DURATION_THRESHOLD_DESCRIPTION,
  XREAD_BLOCK_DURATION_DESCRIPTION,
} from "@scope/consts/cli";
import {
  DbType,
  SQLITE_DB_DEFAULT_FILE,
  SQLITE_DB_DIR,
} from "@scope/consts/db";
import type {
  GlobalCliConfig,
  GlobalCliConfigResolved,
  IndexActionCliConfigResolved,
} from "@scope/types/cli";
import type {
  AdmRecord,
  AdmValues,
  MadaAdmConfigValues,
} from "@scope/types/models";
import { DbConnection, TableDDL } from "@scope/types/db";
import {
  attemptDbConnection,
  injectCommunesDDL,
  injectCommunesDML,
  injectDbConnection,
  injectDistrictsDDL,
  injectDistrictsDML,
  injectFokontanysDDL,
  injectFokontanysDML,
  injectProvincesDDL,
  injectRegionsDDL,
  injectRegionsDML,
  resetCommunesDDL,
  resetDistrictsDDL,
  resetFokontanysDDL,
  resetProvincesDDL,
  resetRegionsDDL,
} from "@scope/db";
import { injectRedisConnection, RedisConnection } from "@scope/redis";
import {
  type QueueWorkersMediator,
  WorkerPool,
} from "@scope/lib/workers-mediators";
import {
  injectInMemoryQueueWorkersMediator,
} from "@scope/lib/in-memory-workers-mediators";
import {
  injectRedisQueueWorkersMediator,
} from "@scope/lib/redis-workers-mediators";
import type { SeedAdmJobContext } from "@scope/types/command";
import {
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_ENTRIES_COUNT_BY_CODE,
  ADM_LEVEL_INDEX_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  ADM_SEEDING_INPUT_FILENAMES_BY_CODE,
  ADM_SEEDING_INPUTS_DIR,
  AdmLevelCode,
} from "@scope/consts/models";
import { TextLineStream } from "@std/streams";
import {
  compareAdmValues,
  isCommuneValues,
  isDistrictValues,
  isFokontanyValues,
  isProvinceValues,
  isRegionValues,
} from "@scope/helpers/models";
import {
  resolveGlobalCliConfig,
  resolveIndexCliConfig,
} from "@scope/helpers/cli";

const PROGRESS_BARS_LINES_COUNT = 5;

/**
 * The root CLI command for the administrative data pipeline.
 * Responsible for parsing global database connection arguments,
 * merging CLI flags with environment variables, and initializing
 * the appropriate database adapter.
 */
export class CliIndexCommand extends Command<GlobalCliConfig, void> {
  /**
   * The database connection instance based on the database type and the database connection params.
   */
  #db!: DbConnection;

  private getAdmNameWithContext(m: AdmValues | AdmRecord): string {
    if (isFokontanyValues(m)) {
      return `${m.fokontany} (${m.commune}, ${m.district}, ${m.region}, ${m.province})`;
    } else if (isCommuneValues(m)) {
      return `${m.commune} (${m.district}, ${m.region}, ${m.province})`;
    } else if (isDistrictValues(m)) {
      return `${m.district} (${m.region}, ${m.province})`;
    } else if (isRegionValues(m)) {
      return `${m.region} (${m.province})`;
    } else if (isProvinceValues(m)) {
      return m.province;
    }
    return "unknown";
  }

  /**
   * Initializes the root CLI command with global options and environment
   * variable mappings for database configuration.
   */
  constructor() {
    super();
    this.name(CLI_NAME)
      .version(CLI_VERSION)
      .description(CLI_DESCRIPTION)
      .throwErrors()
      // ── Global options ──────────────────────────────────────────────────
      .globalOption("--db-type <type:string>", DB_TYPE_DESCRIPTION)
      .globalOption("--cli-debug [debug:boolean]", DEBUG_DESCRIPTION)
      .group("PostgreSQL configuration")
      .globalOption("--pg.schema <schema:string>", PG_SCHEMA_DESCRIPTION)
      .globalOption("--pg.url <url:string>", PG_URL_DESCRIPTION)
      .globalOption("--pg.host <host:string>", PG_HOST_DESCRIPTION)
      .globalOption("--pg.port <port:number>", PG_PORT_DESCRIPTION, {
        depends: ["pg.host"],
      })
      .globalOption("--pg.user <username:string>", PG_USER_DESCRIPTION, {
        depends: ["pg.host"],
      })
      .globalOption(
        "--pg.password <password:string>",
        PG_PASSWORD_DESCRIPTION,
        {
          depends: ["pg.user"],
        },
      )
      .globalOption(
        "--pg.database <database:string>",
        PG_DATABASE_DESCRIPTION,
        {
          depends: ["pg.user"],
        },
      )
      .globalOption("--pg.ssl [ssl:boolean]", PG_SSL_DESCRIPTION, {
        depends: ["pg.user"],
      })
      .globalOption(
        "--pg.ca-cert-file <filename:string>",
        PG_CA_CERT_FILE_DESCRIPTION,
        {
          depends: ["pg.ssl"],
        },
      )
      .globalOption(
        "--pg.ca-cert-path <path:string>",
        PG_CA_CERT_PATH_DESCRIPTION,
        {
          conflicts: ["--pg.ca-cert-file"],
          depends: ["pg.ssl"],
        },
      )
      .group("SQLite configuration")
      .globalOption(
        "--sqlite.db-file <filename:string>",
        SQLITE_DB_FILE_DESCRIPTION,
      )
      .globalOption(
        "--sqlite.db-path <path:string>",
        SQLITE_DB_PATH_DESCRIPTION,
        {
          conflicts: ["sqlite.db-file"],
        },
      )
      // ── Global env variables ────────────────────────────────────────────
      .globalEnv("DB_TYPE=<type:string>", DB_TYPE_DESCRIPTION)
      .globalEnv("CLI_DEBUG=<debug:boolean>", DEBUG_DESCRIPTION)
      .globalEnv("PG_URL=<url:string>", PG_URL_DESCRIPTION)
      .globalEnv("PG_HOST=<host:string>", PG_HOST_DESCRIPTION)
      .globalEnv("PG_PORT=<port:number>", PG_PORT_DESCRIPTION)
      .globalEnv("PG_USER=<user:string>", PG_USER_DESCRIPTION)
      .globalEnv("PG_PASSWORD=<password:string>", PG_PASSWORD_DESCRIPTION)
      .globalEnv("PG_DATABASE=<database:string>", PG_DATABASE_DESCRIPTION)
      .globalEnv("PG_SCHEMA=<schema:string>", PG_SCHEMA_DESCRIPTION)
      .globalEnv("PG_SSL=<ssl:boolean>", PG_SSL_DESCRIPTION)
      .globalEnv(
        "PG_CA_CERT_FILE=<file:string>",
        PG_CA_CERT_FILE_DESCRIPTION,
      )
      .globalEnv(
        "PG_CA_CERT_PATH=<path:string>",
        PG_CA_CERT_PATH_DESCRIPTION,
      )
      .globalEnv("SQLITE_DB_FILE <filename:string>", SQLITE_DB_FILE_DESCRIPTION)
      .globalEnv("SQLITE_DB_PATH <path:string>", SQLITE_DB_PATH_DESCRIPTION)
      .globalAction(async (args) => {
        await this.handleGlobalAction(resolveGlobalCliConfig(args));
      })
      // ── Command-scoped Redis options ────────────────────────────────────
      .group("Redis configuration")
      .option(
        "--disable-redis [disabled:boolean]",
        DISABLE_REDIS_DESCRIPTION,
      )
      .option("--redis.url <url:string>", REDIS_URL_DESCRIPTION)
      .option("--redis.host <host:string>", REDIS_HOST_DESCRIPTION)
      .option("--redis.port <port:number>", REDIS_PORT_DESCRIPTION)
      .option("--redis.user <username:string>", REDIS_USERNAME_DESCRIPTION)
      .option(
        "--redis.password <password:string>",
        REDIS_PASSWORD_DESCRIPTION,
      )
      .option("--redis.db <db:number>", REDIS_DB_DESCRIPTION)
      .option("--redis.ssl <ssl:boolean>", REDIS_SSL_DESCRIPTION)
      .option(
        "--redis.cert-file <filename:string>",
        REDIS_CERT_FILE_DESCRIPTION,
        {
          depends: ["redis.ssl"],
        },
      )
      .option("--redis.cert-path <path:string>", REDIS_CERT_PATH_DESCRIPTION, {
        conflicts: ["redis.cert-file"],
        depends: ["redis.ssl"],
      })
      .option(
        "--redis.key-file <filename:string>",
        REDIS_KEY_FILE_DESCRIPTION,
        {
          depends: ["redis.ssl"],
        },
      )
      .option("--redis.key-path <path:string>", REDIS_KEY_PATH_DESCRIPTION, {
        conflicts: ["redis.key-file"],
        depends: ["redis.ssl"],
      })
      .option(
        "--redis.ca-cert-file <filename:string>",
        REDIS_CA_CERT_FILE_DESCRIPTION,
        {
          depends: ["redis.ssl"],
        },
      )
      .option(
        "--redis.ca-cert-path <path:string>",
        REDIS_CA_CERT_PATH_DESCRIPTION,
        {
          conflicts: ["redis.ca-cert-file"],
          depends: ["redis.ssl"],
        },
      )
      // ── Command-scoped Redis env variables ──────────────────────────────
      .env("DISABLE_REDIS=<disabled:boolean>", DISABLE_REDIS_DESCRIPTION)
      .env("REDIS_URL=<url:string>", REDIS_URL_DESCRIPTION)
      .env("REDIS_HOST=<host:string>", REDIS_HOST_DESCRIPTION)
      .env("REDIS_PORT=<port:number>", REDIS_PORT_DESCRIPTION)
      .env("REDIS_USERNAME=<user:string>", REDIS_USERNAME_DESCRIPTION)
      .env("REDIS_PASSWORD=<password:string>", REDIS_PASSWORD_DESCRIPTION)
      .env("REDIS_DB=<db:number>", REDIS_DB_DESCRIPTION)
      .env("REDIS_SSL=<ssl:boolean>", REDIS_SSL_DESCRIPTION)
      .env("REDIS_CERT_FILE=<file:string>", REDIS_CERT_FILE_DESCRIPTION)
      .env("REDIS_CERT_PATH=<path:string>", REDIS_CERT_PATH_DESCRIPTION)
      .env("REDIS_KEY_FILE=<file:string>", REDIS_KEY_FILE_DESCRIPTION)
      .env("REDIS_KEY_PATH=<path:string>", REDIS_KEY_PATH_DESCRIPTION)
      .env(
        "REDIS_CA_CERT_FILE=<file:string>",
        REDIS_CA_CERT_FILE_DESCRIPTION,
      )
      .env(
        "REDIS_CA_CERT_PATH=<path:string>",
        REDIS_CA_CERT_PATH_DESCRIPTION,
      )
      // ── Command-scoped mediator/worker options ──────────────────────────
      .group("Mediator and worker configuration")
      .option(
        "--queue-batch-size <size:number>",
        QUEUE_BATCH_SIZE_DESCRIPTION,
      )
      .option(
        "--queue-max-retries <retries:number>",
        QUEUE_MAX_RETRIES_DESCRIPTION,
      )
      .option(
        "--in-memory-processing-hwm <hwm:number>",
        IN_MEMORY_PROCESSING_HWM_DESCRIPTION,
      )
      .option(
        "--in-memory-insert-hwm <hwm:number>",
        IN_MEMORY_INSERT_HWM_DESCRIPTION,
      )
      .option(
        "--worker-healthcheck-interval <ms:number>",
        WORKER_HEALTHCHECK_INTERVAL_DESCRIPTION,
      )
      .option(
        "--worker-pending-min-duration-threshold <ms:number>",
        WORKER_PENDING_MIN_DURATION_THRESHOLD_DESCRIPTION,
      )
      .option(
        "--xread-block-duration <ms:number>",
        XREAD_BLOCK_DURATION_DESCRIPTION,
      )
      .option(
        "--processing-workers-count <count:number>",
        PROCESSING_WORKERS_COUNT_DESCRIPTION,
      )
      // ── Command-scoped mediator/worker env variables ────────────────────
      .env("QUEUE_BATCH_SIZE=<size:number>", QUEUE_BATCH_SIZE_DESCRIPTION)
      .env(
        "QUEUE_MAX_RETRIES=<retries:number>",
        QUEUE_MAX_RETRIES_DESCRIPTION,
      )
      .env(
        "IN_MEMORY_PROCESSING_HWM=<hwm:number>",
        IN_MEMORY_PROCESSING_HWM_DESCRIPTION,
      )
      .env(
        "IN_MEMORY_INSERT_HWM=<hwm:number>",
        IN_MEMORY_INSERT_HWM_DESCRIPTION,
      )
      .env(
        "WORKER_HEALTHCHECK_INTERVAL=<ms:number>",
        WORKER_HEALTHCHECK_INTERVAL_DESCRIPTION,
      )
      .env(
        "WORKER_PENDING_MIN_DURATION_THRESHOLD=<ms:number>",
        WORKER_PENDING_MIN_DURATION_THRESHOLD_DESCRIPTION,
      )
      .env(
        "XREAD_BLOCK_DURATION=<ms:number>",
        XREAD_BLOCK_DURATION_DESCRIPTION,
      )
      .env(
        "PROCESSING_WORKERS_COUNT=<count:number>",
        PROCESSING_WORKERS_COUNT_DESCRIPTION,
      )
      .action(async (args) => {
        await this.handleIndexAction(resolveIndexCliConfig(args));
      });
  }

  /**
   * Internal handler executed when the global CLI command runs.
   * Instantiates and connects to the database based on the resolved configuration.
   *
   * @param args - The globally resolved CLI and environment configurations.
   */
  private async handleGlobalAction(args: GlobalCliConfigResolved) {
    console.log(
      colors.blue.bold(`\n🚀 Initializing Administrative Data Pipeline`),
    );
    console.log(colors.gray(`   Database Type: ${args.dbType}`));
    switch (args.dbType) {
      case DbType.Postgres: {
        if (args.pg.url) {
          const maskedUrl = args.pg.url.replace(
            /^(postgres(?:ql)?:\/\/.*:)(.*)(@.*)$/,
            "$1****$3",
          );
          console.log(colors.gray(`   PostgreSQL URL: ${maskedUrl}`));
        } else {
          console.log(
            colors.gray(`   PostgreSQL Host: ${args.pg.host}:${args.pg.port}`),
          );
          console.log(colors.gray(`   PostgreSQL User: ${args.pg.user}`));
          console.log(colors.gray(`   Target Database: ${args.pg.database}`));
        }
        break;
      }
      case DbType.SQLite: {
        let fullPath!: string;
        if (args.sqlite.dbFile) {
          fullPath = path.join(SQLITE_DB_DIR, args.sqlite.dbFile);
        } else if (args.sqlite.dbPath) {
          fullPath = path.resolve(args.sqlite.dbPath);
        } else {
          fullPath = path.join(SQLITE_DB_DIR, SQLITE_DB_DEFAULT_FILE);
        }
        console.log(colors.gray(`   SQLite DB File: ${fullPath}`));
        break;
      }
      default:
        break;
    }

    const db = injectDbConnection(args.dbType);
    this.#db = db;

    console.log(colors.blue(`\n🔌 Establishing database connection...`));
    await attemptDbConnection(db, {
      dbType: args.dbType,
      pg: args.pg,
      sqlite: args.sqlite,
    });
    console.log(
      colors.green.bold(`✅ Database connection established successfully!\n`),
    );
  }

  /**
   * Internal handler executed when the index command action runs.
   * Resolves Redis configuration, connects if enabled, and initializes
   * the appropriate queue workers mediator (Redis-backed or in-memory).
   *
   * @param args - The resolved CLI and environment configurations.
   */
  private async handleIndexAction(args: IndexActionCliConfigResolved) {
    let redis: RedisConnection | null = null;

    try {
      const db = injectDbConnection(args.dbType);
      let prevAdmConfigValues: MadaAdmConfigValues | null = null;

      const configDdl = injectMadaAdmConfigDDL(args.dbType, db, {
        pgSchema: args.pgSchema,
      });
      const configDml = injectMadaAdmConfigDML(args.dbType, db, {
        pgSchema: args.pgSchema,
      });

      const tableExists = await configDdl.exists();
      if (tableExists) {
        const existingConfig = await configDml.get();
        if (existingConfig) {
          prevAdmConfigValues = {
            tablesPrefix: existingConfig.tablesPrefix,
            isFkRepeated: existingConfig.isFkRepeated,
            isProvinceRepeated: existingConfig.isProvinceRepeated,
            isProvinceFkRepeated: existingConfig.isProvinceFkRepeated,
            hasGeojson: existingConfig.hasGeojson,
            hasAdmLevel: existingConfig.hasAdmLevel,
          };
        }
      }

      const redisConfig = args.redis;
      const disableRedis = args.disableRedis;

      let mediator: QueueWorkersMediator<
        SeedAdmJobContext,
        AdmValues,
        AdmRecord,
        SeedAdmJobContext,
        AdmRecord
      >;

      if (!disableRedis) {
        redis = injectRedisConnection();
        console.log(colors.blue(`🔌 Establishing Redis connection...`));
        console.log(
          colors.gray(`   Redis Host: ${redisConfig.host}:${redisConfig.port}`),
        );

        await redis.connect(
          redisConfig.url || {
            host: redisConfig.host,
            port: redisConfig.port,
            username: redisConfig.user,
            password: redisConfig.password,
            db: redisConfig.db,
            ssl: redisConfig.ssl,
            certFile: redisConfig.certFile,
            certPath: redisConfig.certPath,
            keyFile: redisConfig.keyFile,
            keyPath: redisConfig.keyPath,
            caCertFile: redisConfig.caCertFile,
            caCertPath: redisConfig.caCertPath,
          },
        );
        console.log(
          colors.green.bold(`✅ Redis connection established successfully!\n`),
        );

        mediator = injectRedisQueueWorkersMediator<
          SeedAdmJobContext,
          AdmValues,
          AdmRecord,
          SeedAdmJobContext,
          AdmRecord
        >(
          redis.client,
          redisConfig.url || {
            host: redisConfig.host,
            port: redisConfig.port,
            username: redisConfig.user,
            password: redisConfig.password,
            db: redisConfig.db,
            ssl: redisConfig.ssl,
          },
          {
            processingContextKey: "seed-adm:processing:context",
            processingStreamKey: "seed-adm:processing:stream",
            insertContextKey: "seed-adm:insert:context",
            insertStreamKey: "seed-adm:insert:stream",
            processingConsumerGroupName: "seed-adm:processing-group",
            insertConsumerGroupName: "seed-adm:insert-group",
            persistedLastMessageKey: "seed-adm:persisted-last:message",
            persistedLastInsertMessageKey:
              "seed-adm:persisted-last-insert:message",
            processingDlqStreamKey: "seed-adm:processing:dlq",
            insertDlqStreamKey: "seed-adm:insert:dlq",
            healthcheckInterval: args.workerHealthcheckInterval,
            pendingMinDurationThreshold: args.workerPendingMinDurationThreshold,
            xreadBlockDuration: args.xreadBlockDuration,
            debug: args.cliDebug,
          },
        );

        console.log(
          colors.green.bold(`✅ Redis Queue Workers Mediator initialized.`),
        );
      } else {
        console.log(
          colors.yellow(`\nℹ️  Redis disabled. Using in-memory mediator.`),
        );

        mediator = injectInMemoryQueueWorkersMediator<
          SeedAdmJobContext,
          AdmValues,
          AdmRecord,
          SeedAdmJobContext,
          AdmRecord
        >({
          processingHwm: args.inMemoryProcessingHwm,
          insertHwm: args.inMemoryInsertHwm,
        });

        console.log(
          colors.green.bold(
            `✅ In-Memory Queue Workers Mediator initialized.\n`,
          ),
        );
      }

      const madaAdmConfigDDL = injectMadaAdmConfigDDL(args.dbType, this.#db, {
        pgSchema: args.pgSchema,
      });
      let provincesDDL!: TableDDL;
      let regionsDDL!: TableDDL;
      let districtsDDL!: TableDDL;
      let communesDDL!: TableDDL;
      let fokontanysDDL!: TableDDL;

      const madaAdmConfigDML = injectMadaAdmConfigDML(args.dbType, this.#db, {
        pgSchema: args.pgSchema,
      });

      const madaAdmConfigTableExists = await madaAdmConfigDDL.exists();
      if (madaAdmConfigTableExists) {
        prevAdmConfigValues = await madaAdmConfigDML.get();
      } else {
        await madaAdmConfigDDL.create();
      }
      let shouldResetAdmConfig = true;
      if (prevAdmConfigValues) {
        this.printAdmConfig(
          "Found existing Mada ADM configuration",
          prevAdmConfigValues,
        );
        console.log(
          colors.yellow(
            `\nWould you like to update the current Mada ADM configuration ?`,
          ),
        );
        shouldResetAdmConfig = await Confirm.prompt({
          message: "Update the current Mada ADM configuration",
          default: false,
        });
      }
      let activeAdmConfigValues!: MadaAdmConfigValues;
      if (shouldResetAdmConfig) {
        if (prevAdmConfigValues) {
          console.log(
            colors.yellow(
              `\nWould you like to clear the tables of the previous configuration ?\nIf no, they will be left intact while new tables are created for the new configuration.`,
            ),
          );
          const shouldClearPrevTables = await Confirm.prompt({
            message: "Clear previous configuration tables",
            default: true,
          });

          if (shouldClearPrevTables) {
            provincesDDL = injectProvincesDDL(
              prevAdmConfigValues,
              args.dbType,
              this.#db,
              {
                pgSchema: args.pgSchema,
              },
            );
            regionsDDL = injectRegionsDDL(
              prevAdmConfigValues,
              args.dbType,
              this.#db,
              {
                pgSchema: args.pgSchema,
              },
            );
            districtsDDL = injectDistrictsDDL(
              prevAdmConfigValues,
              args.dbType,
              this.#db,
              {
                pgSchema: args.pgSchema,
              },
            );
            communesDDL = injectCommunesDDL(
              prevAdmConfigValues,
              args.dbType,
              this.#db,
              {
                pgSchema: args.pgSchema,
              },
            );
            fokontanysDDL = injectFokontanysDDL(
              prevAdmConfigValues,
              args.dbType,
              this.#db,
              {
                pgSchema: args.pgSchema,
              },
            );
            const admTablesExist = (await Promise.all([
              regionsDDL.exists(),
              provincesDDL.exists(),
              districtsDDL.exists(),
              communesDDL.exists(),
              fokontanysDDL.exists(),
            ])).every((exists) => exists);
            if (admTablesExist) {
              const admTablesDDLs = [
                fokontanysDDL,
                communesDDL,
                districtsDDL,
                regionsDDL,
                provincesDDL,
              ];
              await this.#db.transaction(async (transactionContext) => {
                for (const admTableDDL of admTablesDDLs) {
                  await admTableDDL.drop(transactionContext);
                }
              });
            }
          }
          resetProvincesDDL(args.dbType);
          resetRegionsDDL(args.dbType);
          resetDistrictsDDL(args.dbType);
          resetCommunesDDL(args.dbType);
          resetFokontanysDDL(args.dbType);
        }
        const configPromptTitle = prevAdmConfigValues
          ? colors.yellow(
            `\nℹ️  Updating Mada ADM configuration values:`,
          )
          : colors.yellow(
            `\nℹ️  No existing ADM configuration found. Please provide the configuration values:`,
          );
        console.log(configPromptTitle);
        const result = await prompt([
          {
            name: "tablesPrefix",
            message: "Tables Prefix (leave empty for none):",
            type: Input,
          },
          {
            name: "isFkRepeated",
            message: "Are parent tables's foreign keys repeated?",
            type: Confirm,
            default: true,
          },
          {
            name: "isProvinceRepeated",
            message: "Is a parent province's name repeated across sub-tables?",
            type: Confirm,
            default: false,
          },
          {
            name: "isProvinceFkRepeated",
            message:
              "Is a parent province's foreign key repeated across sub-tables?",
            type: Confirm,
            default: false,
          },
          {
            name: "hasGeojson",
            message:
              "Do tables include the spatial geometries of their respective ADM boundaries?",
            type: Confirm,
            default: false,
          },
          {
            name: "hasAdmLevel",
            message:
              "Do the tables include an adm level index (0 to 4) column?",
            type: Confirm,
            default: true,
          },
        ]);
        const rawTablesPrefix = (result.tablesPrefix as string) ?? "";
        const tablesPrefix = rawTablesPrefix.trim() || null;
        activeAdmConfigValues = {
          tablesPrefix,
          isFkRepeated: result.isFkRepeated as boolean,
          isProvinceRepeated: result.isProvinceRepeated as boolean,
          isProvinceFkRepeated: result.isProvinceFkRepeated as boolean,
          hasGeojson: result.hasGeojson as boolean,
          hasAdmLevel: result.hasAdmLevel as boolean,
        };
        await madaAdmConfigDML.createOrUpdate(activeAdmConfigValues);
        this.printAdmConfig(
          "Active Mada ADM Configuration",
          activeAdmConfigValues,
        );
      } else {
        activeAdmConfigValues = {
          tablesPrefix: prevAdmConfigValues!.tablesPrefix,
          isFkRepeated: prevAdmConfigValues!.isFkRepeated,
          isProvinceRepeated: prevAdmConfigValues!.isProvinceRepeated,
          isProvinceFkRepeated: prevAdmConfigValues!.isProvinceFkRepeated,
          hasGeojson: prevAdmConfigValues!.hasGeojson,
          hasAdmLevel: prevAdmConfigValues!.hasAdmLevel,
        };
        this.printAdmConfig(
          "Using existing Mada ADM Configuration",
          activeAdmConfigValues,
        );
      }
      const prevJobContext = await mediator.persistedContext;
      provincesDDL = injectProvincesDDL(
        activeAdmConfigValues,
        args.dbType,
        this.#db,
        {
          pgSchema: args.pgSchema,
        },
      );
      regionsDDL = injectRegionsDDL(
        activeAdmConfigValues,
        args.dbType,
        this.#db,
        {
          pgSchema: args.pgSchema,
        },
      );
      districtsDDL = injectDistrictsDDL(
        activeAdmConfigValues,
        args.dbType,
        this.#db,
        {
          pgSchema: args.pgSchema,
        },
      );
      communesDDL = injectCommunesDDL(
        activeAdmConfigValues,
        args.dbType,
        this.#db,
        {
          pgSchema: args.pgSchema,
        },
      );
      fokontanysDDL = injectFokontanysDDL(
        activeAdmConfigValues,
        args.dbType,
        this.#db,
        {
          pgSchema: args.pgSchema,
        },
      );
      const admTablesExist = (await Promise.all([
        regionsDDL.exists(),
        provincesDDL.exists(),
        districtsDDL.exists(),
        communesDDL.exists(),
        fokontanysDDL.exists(),
      ])).every((exists) => exists);
      let shouldClearJobContext = true;
      let shouldClearDatabase = true;
      if (
        !shouldResetAdmConfig && !args.disableRedis && admTablesExist &&
        prevJobContext
      ) {
        console.log(
          colors.yellow(
            "\nℹ️  Found previous job context.\nYou can choose to resume with it or clear it and restart fresh.",
          ),
        );
        console.log(
          colors.yellow(
            "⚠️  WARNING: If you choose to resume, ensure that the input data has not been modified since the job was last interrupted.\nResuming with modified input data will result in an inconsistent database state.",
          ),
        );
        const resume = await Confirm.prompt({
          message: "Would you like to resume with the previous job context?",
          default: false,
        });
        if (resume) {
          shouldClearDatabase = false;
          shouldClearJobContext = false;
        }
      }
      if (shouldClearJobContext) {
        console.log(colors.red("\nClearing job context..."));
        await mediator.clearPersisted();
        console.log(colors.green("Job context cleared successfully."));
      }
      if (shouldClearDatabase) {
        const ddls = [
          provincesDDL,
          regionsDDL,
          districtsDDL,
          communesDDL,
          fokontanysDDL,
        ];
        if (admTablesExist) {
          console.log(
            colors.yellow(
              "\nThe current ADM tables are going to be dropped anyway because the job must always start with empty ADM tables.\nYou can choose to continue or abort the action now.",
            ),
          );
          const userWantsToContinue = await Confirm.prompt({
            message: "Continue and drop all the current Mada ADM tables?",
            default: true,
          });
          if (!userWantsToContinue) {
            console.log(colors.red("\nAborting the action."));
            return;
          }
          await this.#db.transaction(async (transactionContext) => {
            console.log(colors.red("\nDeleting all Mada ADM tables..."));
            for (const ddl of ddls.toReversed()) {
              console.log(`Deleting table ${ddl.tableName}...`);
              await ddl.drop(transactionContext);
            }
            console.log(
              colors.green("\nAll Mada ADM tables dropped successfully."),
            );
          });
        }
        await this.#db.transaction(async (transactionContext) => {
          console.log(colors.blue("\nCreating all Mada ADM tables..."));
          for (const ddl of ddls) {
            console.log(`Creating table ${ddl.tableName}...`);
            await ddl.create(transactionContext);
          }
          console.log(
            colors.green("\nAll Mada ADM tables created successfully."),
          );
        });
      }
      const jobContext: SeedAdmJobContext = !shouldClearJobContext
        ? prevJobContext!
        : {
          config: activeAdmConfigValues,
          currentAdmLevel: AdmLevelCode.PROVINCE,
          dbConnectionParams: this.#db.params,
          jobTimestamp: Date.now(),
          ddlExtraOptions: {
            pgSchema: args.pgSchema,
          },
          dbType: args.dbType,
          progressBarsLinesCount: PROGRESS_BARS_LINES_COUNT,
        };

      const initialAdmLevelIndex = ADM_LEVEL_INDEX_BY_CODE.get(
        jobContext.currentAdmLevel,
      )!;

      const startTime = Date.now();

      let processingCounter = 0;
      let insertCounter = 0;
      let totalCountForLevel = 0;
      let currentLevelTitle = "";
      let isFirstProgressBarRender = true;

      const renderProgressBars = () => {
        try {
          const { columns } = Deno.consoleSize();
          const barWidth = Math.max(10, columns - 50);

          if (!isFirstProgressBarRender) {
            Deno.stdout.writeSync(
              new TextEncoder().encode(
                ansi.cursorUp(PROGRESS_BARS_LINES_COUNT).eraseDown().toString(),
              ),
            );
          }
          isFirstProgressBarRender = false;

          const renderBar = (
            count: number,
            total: number,
            label: string,
            colorFn: (s: string) => string,
          ) => {
            const actualCount = Math.min(count, total); // To account for overflows from DLQs
            const percentage = total > 0
              ? Math.floor((actualCount / total) * 100)
              : 0;
            const filledWidth = Math.floor((percentage / 100) * barWidth);
            const bar = colorFn("█".repeat(filledWidth)) +
              colors.gray("░".repeat(barWidth - filledWidth));

            console.log(
              `${count.toLocaleString()} ${currentLevelTitle}s ${label} / ${total.toLocaleString()} (${percentage}%)`,
            );
            console.log(`[${bar}]`);
          };

          console.log(""); // Empty line at top
          renderBar(
            processingCounter,
            totalCountForLevel,
            "processed",
            colors.magenta,
          );
          renderBar(
            insertCounter,
            totalCountForLevel,
            "inserted",
            colors.blue,
          );
        } catch (_e) {
          // Ignore errors if terminal is not available or too small
        }
      };

      let resizeTimeout: number | undefined;
      const onResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          renderProgressBars();
        }, 100);
      };
      Deno.addSignalListener("SIGWINCH", onResize);

      try {
        for (
          let i = initialAdmLevelIndex;
          i < ADM_LEVEL_CODES_INDEXED.length;
          i++
        ) {
          const admLevelCode = ADM_LEVEL_CODES_INDEXED[i];
          const levelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevelCode)!;

          const admDataTotalCount = ADM_LEVEL_ENTRIES_COUNT_BY_CODE.get(
            admLevelCode,
          )!;
          totalCountForLevel = admDataTotalCount;
          currentLevelTitle = levelTitle;
          const pulledCounts = await mediator.pulledMessagesCount;
          processingCounter = pulledCounts.processed;
          insertCounter = pulledCounts.inserted;
          isFirstProgressBarRender = true;

          console.log(
            colors.rgb8(
              `\nADM level: ${levelTitle} (${admDataTotalCount} entries)\n`,
              0x27be8c,
            ),
          );

          jobContext.currentAdmLevel = admLevelCode;
          console.log(
            colors.cyan("\n📑 Current job context:\n"),
            JSON.stringify(jobContext, null, 2),
            "\n",
          );

          let inputReadableStream: ReadableStream<AdmValues>;
          if (await mediator.isJobEnded) {
            inputReadableStream = new ReadableStream({
              start(controller) {
                controller.close();
              },
            });
          } else {
            const inputFilePath = path.join(
              Deno.cwd(),
              ADM_SEEDING_INPUTS_DIR,
              ADM_SEEDING_INPUT_FILENAMES_BY_CODE.get(admLevelCode)!,
            );
            const lastPersistedMessage = await mediator.persistedLastMessage;
            if (lastPersistedMessage) {
              console.log(
                `\n${
                  colors.yellow(
                    `Skipping messages from the input file until the following message is found:`,
                  )
                }`,
                JSON.stringify(lastPersistedMessage).slice(0, 255),
              );
            }
            let shouldSkipMessage = !!lastPersistedMessage;
            inputReadableStream = (await Deno.open(inputFilePath))
              .readable
              .pipeThrough(new TextDecoderStream())
              .pipeThrough(new TextLineStream())
              .pipeThrough(
                new TransformStream<string, AdmValues>({
                  transform(chunk, controller) {
                    const admValues = JSON.parse(chunk.trim()) as AdmValues;
                    if (lastPersistedMessage && shouldSkipMessage) {
                      if (compareAdmValues(admValues, lastPersistedMessage)) {
                        shouldSkipMessage = false;
                      }
                      return;
                    }
                    controller.enqueue(admValues);
                  },
                }),
              );
          }

          const disableRedisUrlSearch = `disable-redis=${args.disableRedis}`;
          const processingWorkerURL = new URL(
            "./workers/index.command.processing.worker.ts",
            import.meta.url,
          );
          processingWorkerURL.search = disableRedisUrlSearch;
          const processingWorkers = [...Array(args.processingWorkersCount)].map(
            () =>
              new Worker(
                processingWorkerURL,
                { type: "module" },
              ),
          );
          const insertWorkerURL = new URL(
            "./workers/index.command.insert.worker.ts",
            import.meta.url,
          );
          insertWorkerURL.search = disableRedisUrlSearch;
          const insertWorker = new Worker(
            insertWorkerURL,
            { type: "module" },
          );
          const workers: WorkerPool = {
            processing: processingWorkers,
            insert: insertWorker,
          };

          const mediatorContext: Parameters<typeof mediator.queue>[0] = {
            processing: jobContext,
            insert: jobContext,
          };

          renderProgressBars();

          await mediator.queue(mediatorContext, inputReadableStream, workers, {
            debug: args.cliDebug,
            batchSize: args.queueBatchSize,
            maxRetries: args.queueMaxRetries,
            onProcessingFinished: (payloads: AdmRecord[]) => {
              for (const payload of payloads) {
                const name = this.getAdmNameWithContext(payload);
                console.log(
                  ansi.cursorUp(PROGRESS_BARS_LINES_COUNT) +
                    "\x1b[1L" +
                    ansi.cursorLeft +
                    `✅ Processed ${levelTitle}: ${name}` +
                    ansi.cursorDown(PROGRESS_BARS_LINES_COUNT),
                );
              }
              processingCounter += payloads.length;
              renderProgressBars();
            },
            onInsertFinished: (payloads: AdmRecord[]) => {
              for (const payload of payloads) {
                const name = this.getAdmNameWithContext(payload);
                console.log(
                  ansi.cursorUp(PROGRESS_BARS_LINES_COUNT) +
                    "\x1b[1L" +
                    ansi.cursorLeft +
                    `💾 Inserted ${levelTitle}: ${name}` +
                    ansi.cursorDown(PROGRESS_BARS_LINES_COUNT),
                );
              }
              insertCounter += payloads.length;
              renderProgressBars();
            },
          });

          console.log(`\n🧹 Deleting duplicates for ${levelTitle}...\n`);
          const dmlArgs = [activeAdmConfigValues, args.dbType, this.#db, {
            pgSchema: args.pgSchema,
          }] as const;
          const tableDML = admLevelCode === AdmLevelCode.PROVINCE
            ? injectProvincesDML(...dmlArgs)
            : admLevelCode === AdmLevelCode.REGION
            ? injectRegionsDML(...dmlArgs)
            : admLevelCode === AdmLevelCode.DISTRICT
            ? injectDistrictsDML(...dmlArgs)
            : admLevelCode === AdmLevelCode.COMMUNE
            ? injectCommunesDML(...dmlArgs)
            : injectFokontanysDML(...dmlArgs);

          await tableDML.deleteDuplicates();
          console.log(
            colors.green(`✅ Duplicates removed for ${levelTitle}.\n`),
          );

          // Cleanup for this level
          for (const w of processingWorkers) w.terminate();
          insertWorker?.terminate();
          await mediator.clearQueue();
        }

        // Final Cleanup
        Deno.removeSignalListener("SIGWINCH", onResize);
        await mediator.clearPersisted();

        console.log(
          colors.green(
            "🏁 Mada ADM data seeding process completed successfully.",
          ),
        );
      } catch (error) {
        console.error(`❌ Fatal Error: ${(error as Error).message}`);
      } finally {
        const totalDurationMs = Date.now() - startTime;
        console.log(
          `\n⏱️  Total duration: ${
            DateUtils.formatDuration(totalDurationMs)
          }\n`,
        );
      }
    } catch (error) {
      console.error(`❌ Fatal Error: ${(error as Error).message}`);
    } finally {
      if (redis) {
        console.log("\n🔌 Closing Redis connection...\n");
        redis.close();
      }
      await this.#db.close();
      console.log(`🔌 Closing database connection...`);
    }
  }

  /**
   * Prints the Mada ADM configuration in a human-readable format.
   *
   * @param title - The title of the configuration section.
   * @param values - The configuration values to print.
   */
  private printAdmConfig(title: string, values: MadaAdmConfigValues): void {
    const table = new Table(
      [
        "Tables prefix",
        values.tablesPrefix
          ? colors.green(values.tablesPrefix)
          : colors.gray("None"),
      ],
      [
        "Parent tables' foreign keys are repeated",
        values.isFkRepeated ? colors.green("Yes") : colors.red("No"),
      ],
      [
        "A parent province's name is repeated across sub-tables",
        values.isProvinceRepeated ? colors.green("Yes") : colors.red("No"),
      ],
      [
        "A parent province's foreign key is repeated across sub-tables",
        values.isProvinceFkRepeated ? colors.green("Yes") : colors.red("No"),
      ],
      [
        "A table stores the spatial GeoJSON boundaries of its corresponding ADM",
        values.hasGeojson ? colors.green("Yes") : colors.red("No"),
      ],
      [
        "A table stores its ADM level index (0 to 4)",
        values.hasAdmLevel ? colors.green("Yes") : colors.red("No"),
      ],
    );
    console.log(colors.blue(`\n⚙️  ${title}:`));
    console.log(table.toString());
  }
}

let _cliIndexCommand!: CliIndexCommand;

/**
 * Injects and manages a singleton instance of the CliIndexCommand.
 *
 * @returns The singleton instance of the CLI root command.
 */
export function injectCliIndexCommand(): CliIndexCommand {
  if (!_cliIndexCommand) {
    _cliIndexCommand = new CliIndexCommand();
  }
  return _cliIndexCommand;
}
