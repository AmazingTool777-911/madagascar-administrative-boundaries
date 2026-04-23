import { DbType } from "./db.consts.ts";

/**
 * Contains the name, version and description of the CLI.
 */
export const CLI_NAME = "madm";

/**
 * The version of the CLI.
 */
export const CLI_VERSION = "0.1.0";

/**
 * The description of the CLI.
 */
export const CLI_DESCRIPTION =
  "Incorporates madagascar's subnational administrative boundaries data into an existing database. It takes care of tables migrations, data seeding, and a few update operations.";

export const DB_TYPE_DESCRIPTION =
  `The database type that the command is working with. Either SQLite, MySQL, PostgreSQL (+ PostGIS), or MongoDB. Value: "${DbType.SQLite}" | "${DbType.MySQL}" | "${DbType.Postgres}" | "${DbType.MongoDB}"`;

export const PG_SCHEMA_DESCRIPTION =
  "The PostgreSQL schema to use (e.g. public).";

export const PG_URL_DESCRIPTION =
  "The URL to connect to the PostgreSQL database.";

export const PG_HOST_DESCRIPTION =
  "Hostname or IP address of the PostgreSQL server.";

export const PG_PORT_DESCRIPTION = "Port number of the PostgreSQL server.";

export const PG_USER_DESCRIPTION =
  "Username for authenticating with the PostgreSQL server.";

export const PG_PASSWORD_DESCRIPTION =
  "Password for authenticating with the PostgreSQL server.";

export const PG_DATABASE_DESCRIPTION = "Name of the database to be used.";

export const PG_SSL_DESCRIPTION = "Whether to use SSL for the connection.";

export const PG_CA_CERT_FILE_DESCRIPTION =
  "Filename of the CA certificate under db/.ca-certificates/. Takes precedence over --pg.ca-cert-path.";

export const PG_CA_CERT_PATH_DESCRIPTION =
  "Full path to the CA certificate file. Used when --pg.ca-cert-file is not set.";
