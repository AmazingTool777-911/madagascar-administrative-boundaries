import { RedisClient } from "@iuioiua/redis";
import * as path from "@std/path";
import { REDIS_CA_CERTIFICATES_DIR } from "@scope/consts/db";

/**
 * Configuration for a Redis connection.
 */
export interface RedisConnectionConfig {
  /** The hostname or IP address of the Redis server. */
  host: string;
  /** The port number the Redis server is listening on. */
  port: number;
  /** Optional username for authentication. */
  username?: string;
  /** Optional password for authentication. */
  password?: string;
  /** Optional database index to select after connection. */
  db?: number;
  /** Whether to use TLS for the connection. */
  ssl?: boolean;
  /** Filename of the client certificate under `redis/.ca-certificates/`. */
  certFile?: string;
  /** Full path to the client certificate file. */
  certPath?: string;
  /** Filename of the client key under `redis/.ca-certificates/`. */
  keyFile?: string;
  /** Full path to the client key file. */
  keyPath?: string;
  /** Filename of the CA certificate under `redis/.ca-certificates/`. */
  caCertFile?: string;
  /** Full path to the CA certificate file. */
  caCertPath?: string;
}

/**
 * Parameters for connecting to Redis.
 * Can be either a connection URL string or a configuration object.
 */
export type RedisConnectionParams = string | RedisConnectionConfig;

/**
 * Manages a connection to a Redis server using the @iuioiua/redis driver.
 * It establishes the underlying TCP connection and provides access to the Redis client.
 */
export class RedisConnection {
  /** The underlying Deno connection. */
  #conn: Deno.Conn | null = null;
  /** The native Redis client instance. */
  #client: RedisClient | null = null;

  /**
   * Native getter for the Redis client.
   *
   * @returns The active Redis client.
   * @throws {Error} If the client has not been initialized through a call to {@link connect}.
   */
  get client(): RedisClient {
    if (!this.#client) {
      throw new Error(
        "Redis client has not been initialized. Call connect() first.",
      );
    }
    return this.#client;
  }

  /**
   * Establishes a connection to a Redis server.
   * Creates the Redis client and attempts to make the connection right away.
   * Supports both connection URLs and specific host/port parameters, including authentication and TLS.
   *
   * @param params - Connection parameters as a string URL or an options object.
   */
  async connect(params: RedisConnectionParams): Promise<void> {
    // If a connection already exists, close it before re-initializing
    if (this.#conn) {
      this.close();
    }

    let host: string;
    let port: number;
    let username: string | undefined;
    let password: string | undefined;
    let dbIndex: number | undefined;
    let ssl = false;

    if (typeof params === "string") {
      const isSecure = params.startsWith("rediss://");
      const urlString = params.startsWith("redis://") || isSecure
        ? params
        : `redis://${params}`;
      const url = new URL(urlString);
      host = url.hostname || "localhost";
      port = url.port ? parseInt(url.port) : (isSecure ? 6380 : 6379);
      username = url.username ? decodeURIComponent(url.username) : undefined;
      password = url.password ? decodeURIComponent(url.password) : undefined;
      dbIndex = url.pathname.length > 1
        ? parseInt(url.pathname.slice(1))
        : undefined;
      ssl = isSecure;
    } else {
      host = params.host;
      port = params.port;
      username = params.username;
      password = params.password;
      dbIndex = params.db;
      ssl = params.ssl ?? false;
    }

    if (ssl) {
      let tlsOptions: Parameters<typeof Deno.connectTls>[0] = {
        hostname: host,
        port,
      };

      if (typeof params !== "string") {
        const resolvePath = (file?: string, full?: string) => {
          if (file) {
            return path.join(Deno.cwd(), REDIS_CA_CERTIFICATES_DIR, file);
          }
          return full;
        };

        const certPath = resolvePath(params.certFile, params.certPath);

        const keyPath = resolvePath(params.keyFile, params.keyPath);
        if (certPath && keyPath) {
          tlsOptions = {
            ...tlsOptions,
            cert: await Deno.readTextFile(certPath),
            key: await Deno.readTextFile(keyPath),
          };
        }

        const caCertPath = resolvePath(params.caCertFile, params.caCertPath);
        if (caCertPath) {
          tlsOptions.caCerts = [await Deno.readTextFile(caCertPath)];
        }
      }

      this.#conn = await Deno.connectTls(
        tlsOptions,
      );
    } else {
      this.#conn = await Deno.connect({ hostname: host, port });
    }
    this.#client = new RedisClient(this.#conn);

    if (password) {
      if (username) {
        await this.#client.sendCommand(["AUTH", username, password]);
      } else {
        await this.#client.sendCommand(["AUTH", password]);
      }
    }

    if (dbIndex !== undefined) {
      await this.#client.sendCommand(["SELECT", dbIndex.toString()]);
    }
  }

  /**
   * Closes the active Redis connection.
   * If no connection is active, this method does nothing.
   */
  close(): void {
    if (this.#conn) {
      this.#conn.close();
      this.#conn = null;
      this.#client = null;
    }
  }
}

let _instance: RedisConnection | null = null;

/**
 * Injects (or creates if necessary) the singleton instance of {@link RedisConnection}.
 *
 * @returns The singleton instance of the Redis connection manager.
 */
export function injectRedisConnection(): RedisConnection {
  if (!_instance) {
    _instance = new RedisConnection();
  }
  return _instance;
}
