import { parseArgs } from "@std/cli";
import { injectRedisConnection } from "@scope/redis";
import {
  InMemory,
  type QueueWorkersMediator,
  Redis,
} from "@scope/lib/workers-mediators";
import { DbType } from "@scope/consts/db";
import { CliArgsEnvResolvers } from "@scope/helpers";
import type {
  AdmRecords,
  AdmValuesDiscriminated,
  MadaAdmConfigValues,
  ProvinceValues,
} from "@scope/types/models";
import type { PostgresConnectionParams, TableDDL } from "@scope/types/db";
import {
  injectCommunesPostgresDDL,
  injectCommunesPostgresDML,
  injectDistrictsPostgresDDL,
  injectDistrictsPostgresDML,
  injectFokontanysPostgresDDL,
  injectPostgresDbConnection,
  injectProvincesPostgresDDL,
  injectProvincesPostgresDML,
  injectRegionsPostgresDDL,
  injectRegionsPostgresDML,
} from "@scope/adapters/postgres";
import type { ExtractAdmInputJobContext } from "./extract-adm-input.d.ts";
import {
  ADM_GEOJSON_FILES_PATHS,
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_ENTRIES_COUNT_BY_CODE,
  ADM_LEVEL_INDEX_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  ADM_SEEDING_INPUT_FILENAMES_BY_CODE,
  ADM_SEEDING_INPUTS_GENERATED_DIR,
  AdmLevelCode,
} from "@scope/consts/models";
import * as path from "@std/path";
import { TextLineStream } from "@std/streams";
import type { GeoJSONFeature } from "@scope/types/utils";
import {
  isCommuneValues,
  isDistrictValues,
  isFokontanyValues,
  isRegionValues,
  mapAdmRecordToValues,
} from "@scope/helpers/models";

type Feature = GeoJSONFeature<{
  shapeName: string;
  shapeID: string;
  shapeType: string;
}>;

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
  /** The physical database schema name. */
  schema: string;
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
  processingWorkersCount?: number;
  debug?: boolean;
}

const args = parseArgs(Deno.args, {
  string: [
    "pg-url",
    "pg-host",
    "pg-port",
    "pg-username",
    "pg-password",
    "pg-database",
    "pg-schema",
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
    "processing-workers-count",
  ],
  boolean: ["pg-ssl", "disable-redis", "redis-ssl", "debug"],
  default: {},
});

// 1. Resolve PostgreSQL Parameters
const pgParams: PostgresCliArgs = {
  url: CliArgsEnvResolvers.resolveOptionalString(args["pg-url"], "PG_URL"),
  host: CliArgsEnvResolvers.resolveString(
    args["pg-host"],
    "PG_HOST",
    "localhost",
  ),
  port: CliArgsEnvResolvers.resolveNumber(
    args["pg-port"] as number | undefined,
    "PG_PORT",
    5432,
  ),
  username: CliArgsEnvResolvers.resolveString(
    args["pg-username"],
    "PG_USERNAME",
    "postgres",
  ),
  password: CliArgsEnvResolvers.resolveString(
    args["pg-password"],
    "PG_PASSWORD",
    "",
  ),
  database: CliArgsEnvResolvers.resolveString(
    args["pg-database"],
    "PG_DATABASE",
    "postgres",
  ),
  schema: CliArgsEnvResolvers.resolveString(
    args["pg-schema"],
    "PG_SCHEMA",
    "public",
  ),
  ssl: CliArgsEnvResolvers.resolveBoolean(
    args["pg-ssl"] as boolean | undefined,
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
  processingWorkersCount: CliArgsEnvResolvers.resolveNumber(
    args["processing-workers-count"] as number | undefined,
    "PROCESSING_WORKERS_COUNT",
    5,
  ),
  debug: CliArgsEnvResolvers.resolveBoolean(
    args["debug"] as boolean | undefined,
    "EXTRACT_DEBUG",
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

let pgConnectionParams: PostgresConnectionParams;
const startTime = Date.now();
let jobOutputDir: string | undefined;

try {
  // 3. Establish PostgreSQL Connection
  if (pgParams.url) {
    console.log("🐘 Connecting to PostgreSQL database via URL...");
    console.log(`   URL: ${pgParams.url}`);
    pgConnectionParams = { dbType: DbType.Postgres, connection: pgParams.url };
  } else {
    console.log("🐘 Connecting to PostgreSQL database via configuration...");
    console.log(`   Host:     ${pgParams.host}`);
    console.log(`   Port:     ${pgParams.port}`);
    console.log(`   User:     ${pgParams.username}`);
    console.log(`   Database: ${pgParams.database}`);
    console.log(`   SSL:      ${pgParams.ssl ?? "false"}`);

    pgConnectionParams = {
      dbType: DbType.Postgres,
      connection: {
        host: pgParams.host,
        port: pgParams.port,
        username: pgParams.username,
        password: pgParams.password,
        database: pgParams.database,
        ssl: pgParams.ssl,
      },
    };
  }
  await pg.connect(pgConnectionParams);
  console.log("✅ PostgreSQL connection established.");

  // Ensure PostGIS extension is enabled for spatial data support
  console.log("🛰️  Enabling PostGIS extension...");
  await pg.client.queryObject("CREATE EXTENSION IF NOT EXISTS postgis;");

  let mediator: QueueWorkersMediator<
    ExtractAdmInputJobContext,
    Feature,
    AdmRecords,
    ExtractAdmInputJobContext,
    AdmValuesDiscriminated
  >;

  // 4. Optionally Establish Redis Connection
  if (!redisCliArgs.disableRedis) {
    const redisConfig = redisCliArgs.url
      ? redisCliArgs.url
      : {
          host: redisCliArgs.host,
          port: redisCliArgs.port,
          username: redisCliArgs.username,
          password: redisCliArgs.password,
          db: redisCliArgs.db,
          ssl: redisCliArgs.ssl,
        };

    if (typeof redisConfig === "string") {
      console.log("\n🔴 Connecting to Redis via URL...");
      console.log(`   URL: ${redisConfig}`);
    } else {
      console.log("\n🔴 Connecting to Redis via configuration...");
      console.log(`   Host: ${redisConfig.host}`);
      console.log(`   Port: ${redisConfig.port}`);
      if (redisConfig.username) {
        console.log(`   User: ${redisConfig.username}`);
      }
      console.log(`   DB:   ${redisConfig.db}`);
      console.log(`   SSL:  ${redisConfig.ssl ?? "false"}`);
    }

    await redis.connect(redisConfig);
    console.log("✅ Redis connection established.");

    mediator = Redis.injectRedisQueueWorkersMediator<
      ExtractAdmInputJobContext,
      Feature,
      AdmRecords,
      ExtractAdmInputJobContext,
      AdmValuesDiscriminated
    >(redis.client!, redisConfig, {
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
      debug: mediatorCliArgs.debug,
    });
    console.log("✅ Redis Queue Workers Mediator initialized.");
  } else {
    console.log("\nℹ️  Redis connection disabled. Skipping...");

    mediator = InMemory.injectInMemoryQueueWorkersMediator<
      ExtractAdmInputJobContext,
      Feature,
      AdmRecords,
      ExtractAdmInputJobContext,
      AdmValuesDiscriminated
    >({
      processingHwm: mediatorCliArgs.inMemoryProcessingHwm,
      insertHwm: mediatorCliArgs.inMemoryInsertHwm,
    });
    console.log("✅ In-Memory Queue Workers Mediator initialized.");
  }

  // 5. Initialize and create ADM Level tables
  console.log("\n🚀 Preparing ADM Level tables...");

  const ddls: TableDDL[] = [
    injectProvincesPostgresDDL(config, pg, pgParams.schema),
    injectRegionsPostgresDDL(config, pg, pgParams.schema),
    injectDistrictsPostgresDDL(config, pg, pgParams.schema),
    injectCommunesPostgresDDL(config, pg, pgParams.schema),
    injectFokontanysPostgresDDL(config, pg, pgParams.schema),
  ];

  // Check if all tables are already defined to decide whether to prompt for clearing
  const admTablesAreDefined = (
    await Promise.all(ddls.map((ddl) => ddl.exists()))
  ).every((exists) => exists);

  let shouldClearDatabase = false;

  if (!redisCliArgs.disableRedis && admTablesAreDefined) {
    console.log();
    shouldClearDatabase = confirm(
      "⚠️  ADM tables already exist. Do you want to drop and recreate them? (This will clear all ADM data)",
    );
    console.log();
  } else {
    // If not all tables are defined or Redis is disabled (ephemeral), we must initialize them
    shouldClearDatabase = true;
  }

  // Handle persisted job context for resuming operations
  const prevJobContext = await mediator.persistedContext;
  if (prevJobContext) {
    let shouldClearContext = false;
    if (shouldClearDatabase) {
      // If we are clearing the database, we must clear the job context to stay in sync
      shouldClearContext = true;
    } else {
      console.log();
      shouldClearContext = confirm(
        "🔄 Previous job context found. Do you want to clear it and start fresh?",
      );
      console.log();
      if (shouldClearContext) {
        // Clearing context usually implies a need for a clean database state
        shouldClearDatabase = true;
      }
    }

    if (shouldClearContext) {
      console.log("🧹 Clearing previous job context...");
      await mediator.clearPersisted();
    }
  }

  // Execute database initialization if needed
  if (shouldClearDatabase) {
    console.log("🏗️  Initializing database schema...");
    await pg.transaction(async (txCtx) => {
      // Drop tables in reverse order to respect foreign key constraints
      for (const ddl of [...ddls].reverse()) {
        console.log(`   🗑️  Dropping table: ${ddl.tableName}...`);
        await ddl.drop(txCtx);
      }
      // Create tables in order Level 0 to 4
      for (const ddl of ddls) {
        console.log(`   🏗️  Creating table: ${ddl.tableName}...`);
        await ddl.create(txCtx);
      }
    });
    console.log("✅ ADM Level tables initialized.");
  } else {
    console.log("ℹ️  Existing database schema preserved.");
  }

  /**
   * Resolve the job context:
   * 1. Resume from previous context if available and DB was not cleared.
   * 2. Otherwise, start a fresh context from Level 0 (Province).
   */
  const jobTimestamp =
    !shouldClearDatabase && prevJobContext?.jobTimestamp
      ? prevJobContext.jobTimestamp
      : Date.now();

  const jobContext: ExtractAdmInputJobContext =
    !shouldClearDatabase && prevJobContext
      ? { ...prevJobContext, jobTimestamp }
      : {
          config,
          currentAdmLevel: AdmLevelCode.PROVINCE,
          pgConnection: pgConnectionParams.connection,
          pgSchema: pgParams.schema,
          jobTimestamp,
        };

  if (!shouldClearDatabase && prevJobContext) {
    console.log("🔄 Resuming extraction from previous state.");
  } else {
    console.log("🆕 Starting fresh extraction process.");
  }

  console.log(`   Target Schema:  ${pgParams.schema}`);

  const jobOutputDirPath = path.join(
    Deno.cwd(),
    ADM_SEEDING_INPUTS_GENERATED_DIR,
    jobContext.jobTimestamp.toString(),
  );
  jobOutputDir = jobOutputDirPath;
  console.log(`   Output Folder:  ${jobOutputDir}`);

  // 6. Extraction Loop
  const startIndex = ADM_LEVEL_INDEX_BY_CODE.get(
    jobContext.currentAdmLevel,
  ) as number;
  const levelsToProcess = ADM_LEVEL_CODES_INDEXED.slice(startIndex);

  for (const levelCode of levelsToProcess) {
    // Explicitly sync the job context with the current iteration level
    jobContext.currentAdmLevel = levelCode;

    const levelTitle = ADM_LEVEL_TITLE_BY_CODE.get(levelCode) as string;
    const levelIndex = ADM_LEVEL_INDEX_BY_CODE.get(levelCode) as number;
    const ndjsonFilePath = path.join(
      Deno.cwd(),
      ADM_GEOJSON_FILES_PATHS[levelIndex],
    );

    console.log(
      `\n📂 Processing ${levelTitle.toUpperCase()} (${levelCode})...`,
    );
    console.log(`   Source: ${ndjsonFilePath}`);

    // Initialize Worker Pool
    const processingWorkersCount = mediatorCliArgs.processingWorkersCount!;
    const workerOptions: WorkerOptions = {
      type: "module" as const,
    };

    const disableRedisParam = `disable-redis=${redisCliArgs.disableRedis}`;

    const processingWorkerUrl = new URL(
      "./workers/processing.worker.ts",
      import.meta.url,
    );
    processingWorkerUrl.search = disableRedisParam;

    const processingWorkers = Array.from({
      length: processingWorkersCount,
    }).map(() => new Worker(processingWorkerUrl.href, workerOptions));

    const insertWorkerUrl = new URL(
      "./workers/insert.worker.ts",
      import.meta.url,
    );
    insertWorkerUrl.search = disableRedisParam;

    let insertWorker: Worker | undefined;
    if (levelCode !== AdmLevelCode.FOKONTANY) {
      insertWorker = new Worker(insertWorkerUrl.href, workerOptions);
    }

    const workers: { processing: Worker[]; insert?: Worker } = {
      processing: processingWorkers,
    };

    if (insertWorker) {
      workers.insert = insertWorker;
    }

    // Prepare feature stream with resumption support
    let featureStream: ReadableStream<Feature>;

    if (await mediator.isJobEnded) {
      console.log(
        `   ✅ Level ${levelCode} already completed in previous session. Skipping...`,
      );
      featureStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
    } else {
      const lastPersisted = await mediator.persistedLastMessage;
      let skipping =
        !!lastPersisted &&
        (lastPersisted as Feature).properties?.shapeType === levelCode;

      featureStream = (await Deno.open(ndjsonFilePath)).readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        .pipeThrough(
          new TransformStream<string, Feature>({
            transform(chunk, controller) {
              const feature = JSON.parse(chunk) as Feature;
              if (skipping && lastPersisted) {
                const last = lastPersisted as Feature;
                if (
                  feature.properties.shapeID === last.properties.shapeID &&
                  feature.properties.shapeType === last.properties.shapeType
                ) {
                  console.log(
                    `   ⏭️  Reached last checkpoint: ${feature.properties.shapeName}. Resuming...`,
                  );
                  skipping = false;
                  // We skip the matched one as it was already inserted
                  return;
                }
                // Still skipping
                return;
              }
              controller.enqueue(feature);
            },
          }),
        );
    }

    const admLevelTotalEntriesCount =
        ADM_LEVEL_ENTRIES_COUNT_BY_CODE.get(levelCode)!,
      admLevelTotalEntriesCountFormatted =
        admLevelTotalEntriesCount.toLocaleString();
    let admLevelProcessedEntriesCounter = 0;
    let admLevelInsertedEntriesCounter = 0;

    const outputFilename = ADM_SEEDING_INPUT_FILENAMES_BY_CODE.get(levelCode)!;
    let outputWriter: WritableStreamDefaultWriter<Uint8Array> | undefined;
    let outputFile: Deno.FsFile | undefined;

    if (outputFilename) {
      await Deno.mkdir(jobOutputDir, { recursive: true });
      const outputPath = path.join(jobOutputDir, outputFilename);
      outputFile = await Deno.open(outputPath, {
        create: true,
        append: true,
        write: true,
      });
      outputWriter = outputFile.writable.getWriter();
    }

    try {
      await mediator.queue(
        { processing: jobContext, insert: jobContext },
        featureStream,
        workers,
        {
          onProcessingFinished: async (payloads) => {
            const encoder = new TextEncoder();
            for (const payload of payloads) {
              const valuesToPersist = mapAdmRecordToValues(payload);

              let value: string | undefined;
              if (isFokontanyValues(valuesToPersist)) {
                value = valuesToPersist.fokontany;
              } else if (isCommuneValues(valuesToPersist)) {
                value = valuesToPersist.commune;
              } else if (isDistrictValues(valuesToPersist)) {
                value = valuesToPersist.district;
              } else if (isRegionValues(valuesToPersist)) {
                value = valuesToPersist.region;
              } else {
                value = (valuesToPersist as ProvinceValues).province;
              }

              console.log(`✅ Processed ${levelTitle}: ${value}`);

              if (outputWriter) {
                await outputWriter.write(
                  encoder.encode(JSON.stringify(valuesToPersist) + "\n"),
                );
              }
            }

            admLevelProcessedEntriesCounter += payloads.length;
            console.log(
              `⏳ Processing progress: ${admLevelProcessedEntriesCounter.toLocaleString()} / ${admLevelTotalEntriesCountFormatted} ${levelTitle}s (${Math.floor(
                (admLevelProcessedEntriesCounter / admLevelTotalEntriesCount) *
                  100,
              )}%)`,
            );
          },
          onInsertFinished: (payloads) => {
            for (const { admLevelCode, values } of payloads) {
              let value: string | undefined;
              switch (admLevelCode) {
                case AdmLevelCode.PROVINCE:
                  value = values.province;
                  break;
                case AdmLevelCode.REGION:
                  value = values.region;
                  break;
                case AdmLevelCode.DISTRICT:
                  value = values.district;
                  break;
                case AdmLevelCode.COMMUNE:
                  value = values.commune;
                  break;
                case AdmLevelCode.FOKONTANY:
                  value = values.fokontany;
                  break;
              }
              console.log(`💾 Inserted ${levelTitle}: ${value}`);
            }
            admLevelInsertedEntriesCounter += payloads.length;
            console.log(
              `⏳ Insert progress: ${admLevelInsertedEntriesCounter.toLocaleString()} / ${admLevelTotalEntriesCountFormatted} ${levelTitle}s (${Math.floor(
                (admLevelInsertedEntriesCounter / admLevelTotalEntriesCount) *
                  100,
              )}%)`,
            );
          },
          batchSize: mediatorCliArgs.queueBatchSize,
          maxRetries: mediatorCliArgs.queueMaxRetries,
        },
      );
    } finally {
      if (outputWriter) {
        await outputWriter.close();
      }
    }

    // 10. Deduplicate records for this level
    console.log(`🧹 Deleting duplicates for ${levelTitle}...`);
    const dml =
      levelCode === AdmLevelCode.PROVINCE
        ? injectProvincesPostgresDML(config, pg, pgParams.schema)
        : levelCode === AdmLevelCode.REGION
          ? injectRegionsPostgresDML(config, pg, pgParams.schema)
          : levelCode === AdmLevelCode.DISTRICT
            ? injectDistrictsPostgresDML(config, pg, pgParams.schema)
            : injectCommunesPostgresDML(config, pg, pgParams.schema);

    await dml.deleteDuplicates();
    console.log(`✅ Duplicates removed for ${levelTitle}.`);

    // Cleanup for this level
    for (const w of processingWorkers) w.terminate();
    insertWorker?.terminate();
    await mediator.clearQueue();

    console.log(`✅ ${levelTitle.toUpperCase()} extraction complete.`);
  }

  // Final Cleanup
  await mediator.clearPersisted();

  console.log("   🧹 Dropping ADM Level tables...");
  await pg.transaction(async (transactionContext) => {
    // Drop in reverse order to respect dependencies if any
    for (const ddl of ddls.toReversed()) {
      await ddl.drop(transactionContext);
    }
  });
  console.log("✅ ADM Level tables dropped.");

  console.log("\n🏁 Extraction process completed successfully.");
} catch (err) {
  console.error(`\n❌ Fatal Error: ${(err as Error).message}`);
  Deno.exit(1);
} finally {
  await pg.close();
  redis.close();

  const totalDurationMs = Date.now() - startTime;
  const totalDurationSeconds = (totalDurationMs / 1000).toFixed(2);
  console.log(`⏱️  Total duration: ${totalDurationSeconds}s`);
  if (jobOutputDir) {
    console.log(`📂 Final outputs stored in: ${jobOutputDir}`);
  }

  console.log("\n👋 Connections closed.");
}
