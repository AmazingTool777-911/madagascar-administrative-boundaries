import { Command } from "@cliffy/command";
import {
  CLI_DESCRIPTION,
  CLI_NAME,
  CLI_VERSION,
  DB_TYPE_DESCRIPTION,
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
} from "@scope/consts/cli";
import { DbType } from "@scope/consts/db";
import {
  CliConfig,
  GlobalCliConfig,
  PostgresDbConnectionCliConfig,
} from "@scope/types/cli";
import { attemptDbConnection, injectDbConnection } from "@scope/db";
import type { DbConnection } from "@scope/types/db";

/**
 * The root CLI command for the administrative data pipeline.
 * Responsible for parsing global database connection arguments,
 * merging CLI flags with environment variables, and initializing
 * the appropriate database adapter.
 */
export class CliIndexCommand extends Command<void, void, CliConfig> {
  #db!: DbConnection;

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
        await this.handleGlobalAction({
          dbType: args.dbType as DbType,
          pg,
        });
      });
  }

  /**
   * Internal handler executed when the global CLI command runs.
   * Instantiates and connects to the database based on the resolved configuration.
   *
   * @param args The globally resolved CLI and environment configurations.
   */
  private async handleGlobalAction(args: GlobalCliConfig) {
    this.#db = injectDbConnection(args.dbType);

    await attemptDbConnection(this.#db, {
      dbType: args.dbType,
      pg: args.pg,
    });
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
