import { DbType } from "./db.consts.ts";

/**
 * Contains the name, version and description of the CLI.
 */
export const CLI_NAME: string = "mada-adm";

/**
 * The version of the CLI.
 */
export const CLI_VERSION: string = "0.1.0";

/**
 * The description of the CLI.
 */
export const CLI_DESCRIPTION: string =
  "Incorporates madagascar's subnational administrative boundaries data into an existing database. It takes care of tables migrations, data seeding, and a few update operations.";

export const DB_TYPE_DESCRIPTION: string =
  `The database type that the command is working with. Either SQLite, MySQL, PostgreSQL (+ PostGIS), or MongoDB. Value: "${DbType.SQLite}" | "${DbType.MySQL}" | "${DbType.Postgres}" | "${DbType.MongoDB}"`;

export const DEBUG_DESCRIPTION: string =
  "Enable debug logging across the pipeline.";

// ── PostgreSQL descriptions ───────────────────────────────────────────────

export const PG_SCHEMA_DESCRIPTION: string =
  "The PostgreSQL schema to use (e.g. public).";

export const PG_URL_DESCRIPTION: string =
  "The URL to connect to the PostgreSQL database.";

export const PG_HOST_DESCRIPTION: string =
  "Hostname or IP address of the PostgreSQL server.";

export const PG_PORT_DESCRIPTION: string =
  "Port number of the PostgreSQL server.";

export const PG_USER_DESCRIPTION: string =
  "Username for authenticating with the PostgreSQL server.";

export const PG_PASSWORD_DESCRIPTION: string =
  "Password for authenticating with the PostgreSQL server.";

export const PG_DATABASE_DESCRIPTION: string =
  "Name of the database to be used.";

export const PG_SSL_DESCRIPTION: string =
  "Whether to use SSL for the connection.";

export const PG_CA_CERT_FILE_DESCRIPTION: string =
  "Filename of the CA certificate under db/.ca-certificates/. Takes precedence over --pg.ca-cert-path.";

export const PG_CA_CERT_PATH_DESCRIPTION: string =
  "Full path to the CA certificate file. Used when --pg.ca-cert-file is not set.";

// ── SQLite descriptions ─────────────────────────────────────────────────────

export const SQLITE_DB_FILE_DESCRIPTION: string =
  "The file of the SQLite database within the `db/.sqlite` directory.";

export const SQLITE_DB_PATH_DESCRIPTION: string =
  "Path to the SQLite database file.";

// ── Redis descriptions ─────────────────────────────────────────────────────

export const DISABLE_REDIS_DESCRIPTION: string =
  'Disable Redis connection ("true" / "1" = disabled, default = enabled).';

export const REDIS_URL_DESCRIPTION: string =
  "Full Redis connection URL. When set, all individual fields are ignored.";

export const REDIS_HOST_DESCRIPTION: string =
  "Hostname or IP address of the Redis server.";

export const REDIS_PORT_DESCRIPTION: string =
  "TCP port the Redis server listens on.";

export const REDIS_USERNAME_DESCRIPTION: string =
  "Optional username for Redis authentication.";

export const REDIS_PASSWORD_DESCRIPTION: string =
  "Optional password for Redis authentication.";

export const REDIS_DB_DESCRIPTION: string =
  "Optional database index (default 0).";

export const REDIS_SSL_DESCRIPTION: string =
  "Enable TLS/SSL for the connection.";

export const REDIS_CERT_FILE_DESCRIPTION: string =
  "Filename of the client certificate under redis/.ca-certificates/.";

export const REDIS_CERT_PATH_DESCRIPTION: string =
  "Full path to the client certificate file.";

export const REDIS_KEY_FILE_DESCRIPTION: string =
  "Filename of the client key under redis/.ca-certificates/.";

export const REDIS_KEY_PATH_DESCRIPTION: string =
  "Full path to the client key file.";

export const REDIS_CA_CERT_FILE_DESCRIPTION: string =
  "Filename of the CA certificate under redis/.ca-certificates/.";

export const REDIS_CA_CERT_PATH_DESCRIPTION: string =
  "Full path to the CA certificate file for Redis.";

// ── Mediator / Worker descriptions ──────────────────────────────────────────

export const QUEUE_BATCH_SIZE_DESCRIPTION: string =
  "Batch size for processing messages concurrently.";

export const QUEUE_MAX_RETRIES_DESCRIPTION: string =
  "Maximum number of retries per batch in case of an error.";

export const IN_MEMORY_PROCESSING_HWM_DESCRIPTION: string =
  "Default high water mark for in-memory processing workers.";

export const IN_MEMORY_INSERT_HWM_DESCRIPTION: string =
  "Default high water mark for the in-memory insert worker.";

export const WORKER_HEALTHCHECK_INTERVAL_DESCRIPTION: string =
  "Interval for worker healthcheck in milliseconds.";

export const WORKER_PENDING_MIN_DURATION_THRESHOLD_DESCRIPTION: string =
  "Threshold for claiming pending messages in milliseconds.";

export const XREAD_BLOCK_DURATION_DESCRIPTION: string =
  "Duration in milliseconds for XREAD BLOCK calls in Redis.";

export const PROCESSING_WORKERS_COUNT_DESCRIPTION: string =
  "Number of concurrent processing workers to spawn per ADM level.";

// Update field command

export const UPDATE_FIELD_COMMAND_NAME = "update-field";

export const UPDATE_FIELD_COMMAND_DESCRIPTION =
  "Updates the field of an ADM record in the database.";

export const UPDATE_FIELD_COMMAND_ARGUMENTS_DESCRIPTIONS = {
  ADM_LEVEL: "The ADM level of the record.",
  FIELD: "The field to update.",
};

export const UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS = {
  PROVINCE: "The name of the province.",
  REGION: "The name of the region.",
  DISTRICT: "The name of the district.",
  DISTRICT_REGION: "The name of the region of the district.",
  COMMUNE: "The name of the commune.",
  COMMUNE_DISTRICT: "The name of the district of the commune.",
  COMMUNE_REGION: "The name of the region of the commune.",
  FOKONTANY: "The name of the fokontany.",
  FOKONTANY_COMMUNE: "The name of the commune of the fokontany.",
  FOKONTANY_DISTRICT: "The name of the district of the fokontany.",
  FOKONTANY_REGION: "The name of the region of the fokontany.",
};

export const UPDATE_FIELD_COMMAND_VALUE_OPTION_DESCRIPTION =
  "The value to set for the field.";

export const UPDATE_FIELD_COMMAND_VALUE_FILE_OPTION_DESCRIPTION =
  "Filename under commands/.args to read the value from. Useful for large content like GeoJSON.";

export const UPDATE_FIELD_COMMAND_VALUE_PATH_OPTION_DESCRIPTION =
  "Full path to the file to read the value from.";

export const CLI_LARGE_CONTENT_ARGS_DIR = "commands/.args";

export const CLI_VALUE_ARG_FILE = "value.txt";

// Set config command

export const SET_CONFIG_COMMAND_NAME = "set-config";

export const SET_CONFIG_COMMAND_DESCRIPTION =
  "Interactively sets or updates the Mada ADM configuration stored in the database.";

// Clear command

export const CLEAR_COMMAND_NAME = "clear";

export const CLEAR_COMMAND_DESCRIPTION =
  "Drops all ADM tables and the configuration table from the database.";
