import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { colors } from "@cliffy/ansi/colors";
import {
  CLEAR_COMMAND_DESCRIPTION,
  CLEAR_COMMAND_NAME,
} from "@scope/consts/cli";
import type { GlobalCliConfig } from "@scope/types/cli";
import type { DbConnection } from "@scope/types/db";
import {
  injectCommunesDDL,
  injectDbConnection,
  injectDistrictsDDL,
  injectFokontanysDDL,
  injectMadaAdmConfigDML,
  injectProvincesDDL,
  injectRegionsDDL,
} from "@scope/db";
import { injectMadaAdmConfigDDL } from "@scope/db/ddl";

/**
 * CLI sub-command that drops all ADM tables and the configuration table from
 * the database, effectively resetting the Mada ADM state.
 */
export class CliClearCommand extends Command<GlobalCliConfig, void> {
  /**
   * Initializes the clear sub-command with its name, description, and action
   * handler.
   */
  constructor() {
    super();
    this
      .name(CLEAR_COMMAND_NAME)
      .description(CLEAR_COMMAND_DESCRIPTION)
      .action(async (options) => {
        try {
          await this.handleClear(options);
        } catch (error) {
          console.error(
            `\n${colors.red("❌ Error:")} ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          Deno.exit(1);
        }
      });
  }

  /**
   * Main handler: checks for an existing ADM config, drops ADM tables if they
   * exist, then drops the config table.
   *
   * @param options - The globally resolved CLI configuration.
   */
  private async handleClear(options: GlobalCliConfig): Promise<void> {
    let db!: DbConnection;

    try {
      db = injectDbConnection(options.dbType);
      const pgSchema = options.pg?.schema;

      const madaAdmConfigDDL = injectMadaAdmConfigDDL(options.dbType, db, {
        pgSchema,
      });
      const madaAdmConfigDML = injectMadaAdmConfigDML(options.dbType, db, {
        pgSchema,
      });

      // ── 1. Check for existing config ──────────────────────────────────────

      const configTableExists = await madaAdmConfigDDL.exists();
      if (!configTableExists) {
        console.log(
          colors.yellow(
            `\nℹ️  No Mada ADM configuration found in the database. Nothing to clear.`,
          ),
        );
        return;
      }

      const existingConfig = await madaAdmConfigDML.get();
      if (!existingConfig) {
        console.log(
          colors.yellow(
            `\nℹ️  No Mada ADM configuration found in the database. Nothing to clear.`,
          ),
        );
        return;
      }

      // ── 2. Confirm before proceeding ──────────────────────────────────────

      console.log(
        colors.yellow(
          `\n⚠️  This will permanently delete all ADM tables and the configuration table from the database.`,
        ),
      );

      const confirmed = await Confirm.prompt({
        message: "Are you sure you want to clear all Mada ADM data?",
        default: false,
      });

      if (!confirmed) {
        console.log(colors.gray(`\nℹ️  Operation cancelled.`));
        return;
      }

      // ── 3. Drop ADM tables if they exist ──────────────────────────────────

      const provincesDDL = injectProvincesDDL(
        existingConfig,
        options.dbType,
        db,
        { pgSchema },
      );
      const regionsDDL = injectRegionsDDL(
        existingConfig,
        options.dbType,
        db,
        { pgSchema },
      );
      const districtsDDL = injectDistrictsDDL(
        existingConfig,
        options.dbType,
        db,
        { pgSchema },
      );
      const communesDDL = injectCommunesDDL(
        existingConfig,
        options.dbType,
        db,
        { pgSchema },
      );
      const fokontanysDDL = injectFokontanysDDL(
        existingConfig,
        options.dbType,
        db,
        { pgSchema },
      );

      const admTablesExist = (
        await Promise.all([
          provincesDDL.exists(),
          regionsDDL.exists(),
          districtsDDL.exists(),
          communesDDL.exists(),
          fokontanysDDL.exists(),
        ])
      ).some((exists) => exists);

      if (admTablesExist) {
        console.log(
          colors.yellow(`\n🗑️  Dropping ADM tables...`),
        );
        await db.transaction(async (txCtx) => {
          for (
            const ddl of [
              fokontanysDDL,
              communesDDL,
              districtsDDL,
              regionsDDL,
              provincesDDL,
            ]
          ) {
            await ddl.drop(txCtx);
          }
        });
        console.log(colors.green(`✅ ADM tables dropped successfully.`));
      } else {
        console.log(
          colors.gray(`\nℹ️  No ADM tables found. Skipping table deletion.`),
        );
      }

      // ── 4. Drop the config table ───────────────────────────────────────────

      console.log(
        colors.yellow(`\n🗑️  Dropping Mada ADM configuration table...`),
      );
      await madaAdmConfigDDL.drop();
      console.log(
        colors.bold.green(`\n✅ Mada ADM data cleared successfully.`),
      );
    } finally {
      await db.close();
      console.log(
        `\n${colors.green("✅ Database connection closed successfully")}`,
      );
    }
  }
}

let _command: CliClearCommand | null = null;

/**
 * Returns the singleton instance of {@link CliClearCommand},
 * creating it on first call.
 */
export function injectCliClearCommand(): CliClearCommand {
  if (!_command) _command = new CliClearCommand();
  return _command;
}
