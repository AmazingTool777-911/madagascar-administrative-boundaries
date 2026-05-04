/**
 * Supported database types.
 */
export enum DbType {
  Postgres = "postgres",
  MySQL = "mysql",
  SQLite = "sqlite",
  MongoDB = "mongodb",
}

/**
 * Directory under `db/` where CA certificate files are stored for secure
 * database adapter connections.
 */
export const DB_CA_CERTIFICATES_DIR: string = "db/.ca-certificates";

/**
 * Directory under `redis/` where certificate files are stored for secure
 * Redis connections.
 */
export const REDIS_CA_CERTIFICATES_DIR: string = "redis/.ca-certificates";

/**
 * Directory under `db/` where SQLite database files are stored.
 */
export const SQLITE_DB_DIR: string = "db/.sqlite";

/**
 * Default file name of the SQLite database file.
 */
export const SQLITE_DB_DEFAULT_FILE: string = "mada-adm.db";

/**
 * Default PostgreSQL schema name used when none is configured.
 */
export const DEFAULT_PG_SCHEMA: string = "public";

/**
 * Default database type used when none is configured.
 */
export const DEFAULT_DB_TYPE: DbType = DbType.SQLite;
