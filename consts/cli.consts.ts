import { DbType } from "./db.consts.ts";

/**
 * Contains the name, version and description of the CLI.
 */
export const CLI_NAME: string = "madm";

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

export const DISABLE_REDIS_DESCRIPTION: string =
  'Disable Redis connection ("true" / "1" = disabled, default = enabled).';
