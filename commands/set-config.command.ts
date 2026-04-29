import { Command } from "@cliffy/command";
import { Confirm, Input, prompt } from "@cliffy/prompt";
import { colors } from "@cliffy/ansi/colors";
import { Table } from "@cliffy/table";
import {
  SET_CONFIG_COMMAND_DESCRIPTION,
  SET_CONFIG_COMMAND_NAME,
} from "@scope/consts/cli";
import type { GlobalCliConfig } from "@scope/types/cli";
import type { MadaAdmConfigValues } from "@scope/types/models";
import type { DbConnection } from "@scope/types/db";
import {
  injectCommunesDDL,
  injectDbConnection,
  injectDistrictsDDL,
  injectFokontanysDDL,
  injectMadaAdmConfigDML,
  injectProvincesDDL,
  injectRegionsDDL,
  resetCommunesDDL,
  resetDistrictsDDL,
  resetFokontanysDDL,
  resetProvincesDDL,
  resetRegionsDDL,
} from "@scope/db";
import { injectMadaAdmConfigDDL } from "@scope/db/ddl";

/**
 * CLI sub-command that interactively sets or updates the Mada ADM configuration
 * stored in the database, and optionally rebuilds the ADM tables when the
 * configuration changes.
 */
export class CliSetConfigCommand extends Command<GlobalCliConfig, void> {
  /**
   * Prints the Mada ADM configuration in a human-readable table.
   *
   * @param title - The section title to display above the table.
   * @param values - The configuration values to render.
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

  /**
   * Initializes the set-config sub-command with its name, description, and
   * interactive action handler.
   */
  constructor() {
    super();
    this
      .name(SET_CONFIG_COMMAND_NAME)
      .description(SET_CONFIG_COMMAND_DESCRIPTION)
      .action(async (options) => {
        try {
          await this.handleSetConfig(options);
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
   * Main handler: looks up the existing config, prompts the user for new
   * values, upserts the config, and optionally rebuilds the ADM tables.
   *
   * @param options - The globally resolved CLI configuration.
   */
  private async handleSetConfig(options: GlobalCliConfig): Promise<void> {
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

      // ── 1. Look up existing config ────────────────────────────────────────

      let prevAdmConfigValues: MadaAdmConfigValues | null = null;

      const tableExists = await madaAdmConfigDDL.exists();
      if (tableExists) {
        const existing = await madaAdmConfigDML.get();
        if (existing) {
          prevAdmConfigValues = {
            tablesPrefix: existing.tablesPrefix,
            isFkRepeated: existing.isFkRepeated,
            isProvinceRepeated: existing.isProvinceRepeated,
            isProvinceFkRepeated: existing.isProvinceFkRepeated,
            hasGeojson: existing.hasGeojson,
            hasAdmLevel: existing.hasAdmLevel,
          };
        }
      }

      if (prevAdmConfigValues) {
        this.printAdmConfig(
          "Found existing Mada ADM configuration",
          prevAdmConfigValues,
        );
      } else {
        console.log(
          colors.yellow(
            `\nℹ️  No existing Mada ADM configuration found in the database.`,
          ),
        );
      }

      // ── 2. Prompt for new config values ───────────────────────────────────

      const configPromptTitle = prevAdmConfigValues
        ? colors.yellow(`\nℹ️  Updating Mada ADM configuration values:`)
        : colors.yellow(
          `\nℹ️  No existing ADM configuration found. Please provide the configuration values:`,
        );
      console.log(configPromptTitle);

      const result = await prompt([
        {
          name: "tablesPrefix",
          message: "Tables Prefix (leave empty for none):",
          type: Input,
          default: prevAdmConfigValues?.tablesPrefix ?? "",
        },
        {
          name: "isFkRepeated",
          message: "Are parent tables's foreign keys repeated?",
          type: Confirm,
          default: prevAdmConfigValues?.isFkRepeated ?? true,
        },
        {
          name: "isProvinceRepeated",
          message: "Is a parent province's name repeated across sub-tables?",
          type: Confirm,
          default: prevAdmConfigValues?.isProvinceRepeated ?? false,
        },
        {
          name: "isProvinceFkRepeated",
          message:
            "Is a parent province's foreign key repeated across sub-tables?",
          type: Confirm,
          default: prevAdmConfigValues?.isProvinceFkRepeated ?? false,
        },
        {
          name: "hasGeojson",
          message:
            "Do tables include the spatial geometries of their respective ADM boundaries?",
          type: Confirm,
          default: prevAdmConfigValues?.hasGeojson ?? false,
        },
        {
          name: "hasAdmLevel",
          message: "Do the tables include an adm level index (0 to 4) column?",
          type: Confirm,
          default: prevAdmConfigValues?.hasAdmLevel ?? true,
        },
      ]);

      const rawTablesPrefix = (result.tablesPrefix as string) ?? "";
      const tablesPrefix = rawTablesPrefix.trim() || null;

      const newAdmConfigValues: MadaAdmConfigValues = {
        tablesPrefix,
        isFkRepeated: result.isFkRepeated as boolean,
        isProvinceRepeated: result.isProvinceRepeated as boolean,
        isProvinceFkRepeated: result.isProvinceFkRepeated as boolean,
        hasGeojson: result.hasGeojson as boolean,
        hasAdmLevel: result.hasAdmLevel as boolean,
      };

      // ── 3. Upsert the configuration ───────────────────────────────────────

      if (!tableExists) {
        await madaAdmConfigDDL.create();
      }

      await madaAdmConfigDML.createOrUpdate(newAdmConfigValues);
      console.log(
        colors.bold.green(`\n✅ Mada ADM configuration saved successfully.`),
      );

      // ── 4. Display the updated config ─────────────────────────────────────

      this.printAdmConfig("Updated Mada ADM Configuration", newAdmConfigValues);

      // ── 5. Optionally rebuild ADM tables ──────────────────────────────────

      if (prevAdmConfigValues) {
        // Check whether the old ADM tables exist before asking the user
        const provincesDDL = injectProvincesDDL(
          prevAdmConfigValues,
          options.dbType,
          db,
          { pgSchema },
        );
        const regionsDDL = injectRegionsDDL(
          prevAdmConfigValues,
          options.dbType,
          db,
          { pgSchema },
        );
        const districtsDDL = injectDistrictsDDL(
          prevAdmConfigValues,
          options.dbType,
          db,
          { pgSchema },
        );
        const communesDDL = injectCommunesDDL(
          prevAdmConfigValues,
          options.dbType,
          db,
          { pgSchema },
        );
        const fokontanysDDL = injectFokontanysDDL(
          prevAdmConfigValues,
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
        ).every((exists) => exists);

        if (admTablesExist) {
          console.log();

          const shouldRebuild = await Confirm.prompt({
            message:
              "Clear the ADM tables built with the previous configuration and create new ones according to the new configuration?",
            default: false,
          });

          if (shouldRebuild) {
            console.log(
              colors.yellow(
                `\n🗑️  Dropping ADM tables built with the previous configuration...`,
              ),
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
            console.log(
              colors.green(`✅ Old ADM tables dropped successfully.`),
            );

            // Reset DDL singletons so they are rebuilt with the NEW config
            resetProvincesDDL(options.dbType);
            resetRegionsDDL(options.dbType);
            resetDistrictsDDL(options.dbType);
            resetCommunesDDL(options.dbType);
            resetFokontanysDDL(options.dbType);

            // Create ADM tables with the NEW config
            const newProvincesDDL = injectProvincesDDL(
              newAdmConfigValues,
              options.dbType,
              db,
              { pgSchema },
            );
            const newRegionsDDL = injectRegionsDDL(
              newAdmConfigValues,
              options.dbType,
              db,
              { pgSchema },
            );
            const newDistrictsDDL = injectDistrictsDDL(
              newAdmConfigValues,
              options.dbType,
              db,
              { pgSchema },
            );
            const newCommunesDDL = injectCommunesDDL(
              newAdmConfigValues,
              options.dbType,
              db,
              { pgSchema },
            );
            const newFokontanysDDL = injectFokontanysDDL(
              newAdmConfigValues,
              options.dbType,
              db,
              { pgSchema },
            );

            console.log(
              colors.yellow(
                `\n🏗️  Creating new ADM tables with the updated configuration...`,
              ),
            );
            await db.transaction(async (txCtx) => {
              for (
                const ddl of [
                  newProvincesDDL,
                  newRegionsDDL,
                  newDistrictsDDL,
                  newCommunesDDL,
                  newFokontanysDDL,
                ]
              ) {
                await ddl.create(txCtx);
              }
            });
            console.log(
              colors.bold.green(`✅ New ADM tables created successfully.`),
            );
          }
        }
      }
    } finally {
      await db.close();
      console.log(
        `\n${colors.green("✅ Database connection closed successfully")}`,
      );
    }
  }
}

let _command: CliSetConfigCommand | null = null;

/**
 * Returns the singleton instance of {@link CliSetConfigCommand},
 * creating it on first call.
 */
export function injectCliSetConfigCommand(): CliSetConfigCommand {
  if (!_command) _command = new CliSetConfigCommand();
  return _command;
}
