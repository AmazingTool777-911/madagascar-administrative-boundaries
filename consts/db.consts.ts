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
export const DB_CA_CERTIFICATES_DIR = "db/.ca-certificates";
