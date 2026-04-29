import { Command, EnumType } from "@cliffy/command";
import { colors } from "@cliffy/ansi/colors";
import type { EntityId } from "@scope/types/db";
import {
  UPDATE_FIELD_COMMAND_ARGUMENTS_DESCRIPTIONS,
  UPDATE_FIELD_COMMAND_DESCRIPTION,
  UPDATE_FIELD_COMMAND_NAME,
  UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS,
  UPDATE_FIELD_COMMAND_VALUE_OPTION_DESCRIPTION,
} from "@scope/consts/cli";
import type {
  GlobalCliConfig,
  UpdateFieldIdentifiersCliConfig,
} from "@scope/types/cli";
import {
  ADM_LEVEL_CODE_BY_TITLE,
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_INDEX_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  AdmLevelCode,
} from "@scope/consts/models";
import {
  injectCommunesDML,
  injectDbConnection,
  injectDistrictsDML,
  injectFokontanysDML,
  injectMadaAdmConfigDML,
  injectProvincesDML,
  injectRegionsDML,
} from "@scope/db";
import { AdmEntity } from "@scope/types/models";

type AdmLevelIdentifiers = {
  admLevel: AdmLevelCode.PROVINCE;
  province: string;
} | {
  admLevel: AdmLevelCode.REGION;
  region: string;
} | {
  admLevel: AdmLevelCode.DISTRICT;
  district: string;
  region: string;
} | {
  admLevel: AdmLevelCode.COMMUNE;
  commune: string;
  district: string;
  region: string;
} | {
  admLevel: AdmLevelCode.FOKONTANY;
  fokontany: string;
  commune: string;
  district: string;
  region: string;
};

const admLevelType = new EnumType(Array.from(ADM_LEVEL_CODE_BY_TITLE.keys()));

const fieldType = new EnumType(
  [
    "value",
    "geojson",
  ] as const,
);

export class CliUpdateFieldCommand extends Command<
  GlobalCliConfig,
  { field: typeof fieldType; admLevel: typeof admLevelType }
> {
  constructor() {
    super();
    this
      .name(UPDATE_FIELD_COMMAND_NAME)
      .description(UPDATE_FIELD_COMMAND_DESCRIPTION)
      .type("admLevel", admLevelType)
      .type("field", fieldType)
      .arguments("<adm-level:admLevel> <field:field>", [
        UPDATE_FIELD_COMMAND_ARGUMENTS_DESCRIPTIONS.ADM_LEVEL,
        UPDATE_FIELD_COMMAND_ARGUMENTS_DESCRIPTIONS.FIELD,
      ])
      .group("Value")
      .option(
        "--value <value:string>",
        UPDATE_FIELD_COMMAND_VALUE_OPTION_DESCRIPTION,
        { required: true },
      )
      .group("Province or Region identifiers")
      .option(
        "--province <province:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.PROVINCE,
      )
      .option(
        "--region <region:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.REGION,
      )
      .group("District identifiers")
      .option(
        "--district.value <district:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.DISTRICT,
      )
      .option(
        "--district.region <district-region:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.DISTRICT_REGION,
        {
          depends: ["district.value"],
        },
      )
      .group("Commune identifiers")
      .option(
        "--commune.value <commune:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.COMMUNE,
      )
      .option(
        "--commune.district <commune-district:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.COMMUNE_DISTRICT,
        {
          depends: ["commune.value"],
        },
      )
      .option(
        "--commune.region <commune-region:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.COMMUNE_REGION,
        {
          depends: ["commune.value"],
        },
      )
      .group("Fokontany identifiers")
      .option(
        "--fokontany.value <fokontany:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.FOKONTANY,
      )
      .option(
        "--fokontany.commune <fokontany-commune:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.FOKONTANY_COMMUNE,
        {
          depends: ["fokontany.value"],
        },
      )
      .option(
        "--fokontany.district <fokontany-district:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.FOKONTANY_DISTRICT,
        {
          depends: ["fokontany.value"],
        },
      )
      .option(
        "--fokontany.region <fokontany-region:string>",
        UPDATE_FIELD_COMMAND_OPTIONS_DESCRIPTIONS.FOKONTANY_REGION,
        {
          depends: ["fokontany.value"],
        },
      )
      .action(async (options, admLevelTitle, field) => {
        try {
          const admLevel = ADM_LEVEL_CODE_BY_TITLE.get(admLevelTitle)!;
          const identifiers = this.enforceAdmLevelIdentifiers(admLevel, {
            province: options.province,
            region: options.region,
            district: options.district,
            commune: options.commune,
            fokontany: options.fokontany,
          });
          if (field === "geojson") {
            await this.handleUpdateAdmLevelGeojsonField(
              options,
              identifiers,
              options.value,
            );
          } else {
            await this.handleUpdateAdmLevelField(
              options,
              identifiers,
              options.value,
            );
          }
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

  private enforceAdmLevelIdentifiers(
    admLevel: AdmLevelCode,
    identifiers: UpdateFieldIdentifiersCliConfig,
  ): AdmLevelIdentifiers {
    switch (admLevel) {
      case AdmLevelCode.PROVINCE: {
        if (!identifiers.province) {
          console.error(
            `\n${colors.red("❌ Error:")} ${"Province is required"}`,
          );
          Deno.exit(1);
        }
        return {
          admLevel: AdmLevelCode.PROVINCE,
          province: identifiers.province,
        };
      }
      case AdmLevelCode.REGION: {
        if (!identifiers.region) {
          console.error(`\n${colors.red("❌ Error:")} ${"Region is required"}`);
          Deno.exit(1);
        }
        return { admLevel: AdmLevelCode.REGION, region: identifiers.region };
      }
      case AdmLevelCode.DISTRICT: {
        if (!identifiers.district?.value || !identifiers.district?.region) {
          console.error(
            `\n${
              colors.red("❌ Error:")
            } ${"District and region are required"}`,
          );
          Deno.exit(1);
        }
        return {
          admLevel: AdmLevelCode.DISTRICT,
          district: identifiers.district.value,
          region: identifiers.district.region,
        };
      }
      case AdmLevelCode.COMMUNE: {
        if (
          !identifiers.commune?.value || !identifiers.commune?.district ||
          !identifiers.commune?.region
        ) {
          console.error(
            `\n${
              colors.red("❌ Error:")
            } ${"Commune, district and region are required"}`,
          );
          Deno.exit(1);
        }
        return {
          admLevel: AdmLevelCode.COMMUNE,
          commune: identifiers.commune.value,
          district: identifiers.commune.district,
          region: identifiers.commune.region,
        };
      }
      case AdmLevelCode.FOKONTANY: {
        if (
          !identifiers.fokontany?.value || !identifiers.fokontany?.commune ||
          !identifiers.fokontany?.district || !identifiers.fokontany?.region
        ) {
          console.error(
            `\n${
              colors.red("❌ Error:")
            } ${"Fokontany, commune, district and region are required"}`,
          );
          Deno.exit(1);
        }
        return {
          admLevel: AdmLevelCode.FOKONTANY,
          fokontany: identifiers.fokontany.value,
          commune: identifiers.fokontany.commune,
          district: identifiers.fokontany.district,
          region: identifiers.fokontany.region,
        };
      }
      default: {
        console.error(
          `\n${
            colors.red("❌ Error:")
          } Invalid adm level: ${admLevel satisfies never}`,
        );
        Deno.exit(1);
      }
    }
  }

  private async handleUpdateAdmLevelField(
    options: GlobalCliConfig,
    identifiers: AdmLevelIdentifiers,
    value: string,
  ) {
    const db = injectDbConnection(options.dbType);
    const pgSchema = options.pg?.schema;
    const madaAdmConfigDML = injectMadaAdmConfigDML(options.dbType, db, {
      pgSchema,
    });

    const config = await madaAdmConfigDML.get();
    if (!config) {
      console.error(
        `\n${
          colors.red("❌ Error:")
        } ${"Mada ADM configuration not found. Run index command first."}`,
      );
      Deno.exit(1);
    }

    const provincesDML = injectProvincesDML(config, options.dbType, db, {
      pgSchema,
    });
    const regionsDML = injectRegionsDML(config, options.dbType, db, {
      pgSchema,
    });
    const districtsDML = injectDistrictsDML(config, options.dbType, db, {
      pgSchema,
    });
    const communesDML = injectCommunesDML(config, options.dbType, db, {
      pgSchema,
    });
    const fokontanysDML = injectFokontanysDML(config, options.dbType, db, {
      pgSchema,
    });

    const targetLevel = identifiers.admLevel;
    const targetLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(targetLevel)!;
    const startIdx = ADM_LEVEL_INDEX_BY_CODE.get(targetLevel)!;
    let parentIds: EntityId[] = [];

    await db.transaction(async (txCtx) => {
      for (let i = startIdx; i < ADM_LEVEL_CODES_INDEXED.length; i++) {
        const currentLevel = ADM_LEVEL_CODES_INDEXED[i];
        const currentLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(currentLevel)!;

        if (
          targetLevel === AdmLevelCode.PROVINCE &&
          i > ADM_LEVEL_INDEX_BY_CODE.get(AdmLevelCode.REGION)! &&
          !config.isProvinceRepeated
        ) {
          break;
        }

        let entities: { id: EntityId }[] = [];

        if (i === startIdx) {
          console.log(
            `Fetching ${targetLevelTitle} data with identifiers:`,
          );
          console.log(JSON.stringify(
            {
              ...identifiers,
              admLevel: targetLevelTitle,
            },
            null,
            2,
          ));

          switch (identifiers.admLevel) {
            case AdmLevelCode.PROVINCE:
              entities = await provincesDML.getManyByNames([
                identifiers.province,
              ], txCtx);
              break;
            case AdmLevelCode.REGION:
              entities = await regionsDML.getManyByNames([
                identifiers.region,
              ], txCtx);
              break;
            case AdmLevelCode.DISTRICT:
              entities = await districtsDML.getManyByAttributes([
                identifiers,
              ], txCtx);
              break;
            case AdmLevelCode.COMMUNE:
              entities = await communesDML.getManyByAttributes([
                identifiers,
              ], txCtx);
              break;
            case AdmLevelCode.FOKONTANY:
              entities = await fokontanysDML.getManyByAttributes([
                identifiers,
              ], txCtx);
              break;
          }

          if (entities.length === 0) {
            console.log(
              colors.red(
                `${targetLevelTitle} ❌ not found with given identifiers.`,
              ),
            );
            Deno.exit(1);
          } else {
            console.log(
              colors.green(
                `🔍 ${targetLevelTitle} ✅ data found.`,
              ),
            );
          }
        } else {
          switch (currentLevel) {
            case AdmLevelCode.REGION:
              entities = await regionsDML.getManyByProvinceIds(
                parentIds,
                txCtx,
              );
              break;
            case AdmLevelCode.DISTRICT:
              entities = await districtsDML.getManyByRegionIds(
                parentIds,
                txCtx,
              );
              break;
            case AdmLevelCode.COMMUNE:
              entities = await communesDML.getManyByDistrictIds(
                parentIds,
                txCtx,
              );
              break;
            case AdmLevelCode.FOKONTANY:
              entities = await fokontanysDML.getManyByCommuneIds(
                parentIds,
                txCtx,
              );
              break;
          }

          if (entities.length === 0) {
            break;
          }
        }

        const currentIds = entities.map((e) => e.id);

        console.log();
        switch (currentLevel) {
          case AdmLevelCode.PROVINCE: {
            console.log(
              `⚙️ Updating ${currentLevelTitle} records (target field: ${targetLevelTitle})...`,
            );
            const result = await provincesDML.updateFieldByIds(
              currentIds,
              targetLevel as AdmLevelCode.PROVINCE,
              value,
              txCtx,
            );
            console.log(
              colors.green(
                `📊 Updated ${result.affectedRows} ${currentLevelTitle} records.`,
              ),
            );
            break;
          }
          case AdmLevelCode.REGION: {
            console.log(
              `Updating ${currentLevelTitle} records (target field: ${targetLevelTitle})...`,
            );
            const result = await regionsDML.updateFieldByIds(
              currentIds,
              targetLevel as AdmLevelCode.REGION | AdmLevelCode.PROVINCE,
              value,
              txCtx,
            );
            console.log(
              colors.green(
                `Updated ${result.affectedRows} ${currentLevelTitle} records.`,
              ),
            );
            break;
          }
          case AdmLevelCode.DISTRICT: {
            console.log(
              `Updating ${currentLevelTitle} records (target field: ${targetLevelTitle})...`,
            );
            const result = await districtsDML.updateFieldByIds(
              currentIds,
              targetLevel as
                | AdmLevelCode.DISTRICT
                | AdmLevelCode.REGION
                | AdmLevelCode.PROVINCE,
              value,
              txCtx,
            );
            console.log(
              colors.green(
                `Updated ${result.affectedRows} ${currentLevelTitle} records.`,
              ),
            );
            break;
          }
          case AdmLevelCode.COMMUNE: {
            console.log(
              `Updating ${currentLevelTitle} records (target field: ${targetLevelTitle})...`,
            );
            const result = await communesDML.updateFieldByIds(
              currentIds,
              targetLevel as
                | AdmLevelCode.COMMUNE
                | AdmLevelCode.DISTRICT
                | AdmLevelCode.REGION
                | AdmLevelCode.PROVINCE,
              value,
              txCtx,
            );
            console.log(
              colors.green(
                `Updated ${result.affectedRows} ${currentLevelTitle} records.`,
              ),
            );
            break;
          }
          case AdmLevelCode.FOKONTANY: {
            console.log(
              `Updating ${currentLevelTitle} records (target field: ${targetLevelTitle})...`,
            );
            const result = await fokontanysDML.updateFieldByIds(
              currentIds,
              targetLevel as
                | AdmLevelCode.FOKONTANY
                | AdmLevelCode.COMMUNE
                | AdmLevelCode.DISTRICT
                | AdmLevelCode.REGION
                | AdmLevelCode.PROVINCE,
              value,
              txCtx,
            );
            console.log(
              colors.green(
                `Updated ${result.affectedRows} ${currentLevelTitle} records.`,
              ),
            );
            break;
          }
        }

        parentIds = currentIds;
      }
    });

    console.log(
      colors.bold.green(
        `\n✅ Successfully updated ${targetLevelTitle} field.`,
      ),
    );

    const updatedIdentifiers = { ...identifiers };
    if (updatedIdentifiers.admLevel === AdmLevelCode.PROVINCE) {
      updatedIdentifiers.province = value;
    } else if (updatedIdentifiers.admLevel === AdmLevelCode.REGION) {
      updatedIdentifiers.region = value;
    } else if (updatedIdentifiers.admLevel === AdmLevelCode.DISTRICT) {
      updatedIdentifiers.district = value;
    } else if (updatedIdentifiers.admLevel === AdmLevelCode.COMMUNE) {
      updatedIdentifiers.commune = value;
    } else if (updatedIdentifiers.admLevel === AdmLevelCode.FOKONTANY) {
      updatedIdentifiers.fokontany = value;
    }

    let finalEntities: AdmEntity[] = [];
    switch (updatedIdentifiers.admLevel) {
      case AdmLevelCode.PROVINCE:
        finalEntities = await provincesDML.getManyByNames([
          updatedIdentifiers.province,
        ]);
        break;
      case AdmLevelCode.REGION:
        finalEntities = await regionsDML.getManyByNames([
          updatedIdentifiers.region,
        ]);
        break;
      case AdmLevelCode.DISTRICT:
        finalEntities = await districtsDML.getManyByAttributes([
          updatedIdentifiers,
        ]);
        break;
      case AdmLevelCode.COMMUNE:
        finalEntities = await communesDML.getManyByAttributes([
          updatedIdentifiers,
        ]);
        break;
      case AdmLevelCode.FOKONTANY:
        finalEntities = await fokontanysDML.getManyByAttributes([
          updatedIdentifiers,
        ]);
        break;
    }

    if (finalEntities.length > 0) {
      console.log(
        colors.cyan(
          `\n📋 Current state of the targeted ${targetLevelTitle} data:`,
        ),
      );
      const updatedEntity = { ...finalEntities[0] };
      "geojson" in updatedEntity && delete updatedEntity["geojson"];
      console.log(JSON.stringify(updatedEntity, null, 2));
    }
  }

  private handleUpdateAdmLevelGeojsonField(
    _options: GlobalCliConfig,
    _identifiers: AdmLevelIdentifiers,
    _value: string,
  ) {
    console.error(
      `\n${
        colors.red("❌ Error:")
      } ${"GeoJSON updating is not yet implemented in the CLI or database adapters."}`,
    );
    Deno.exit(1);
  }
}

let _command: CliUpdateFieldCommand | null = null;

export function injectCliUpdateFieldCommand() {
  if (_command === null) {
    _command = new CliUpdateFieldCommand();
  }
  return _command;
}
