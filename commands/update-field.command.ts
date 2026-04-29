import { Command, EnumType } from "@cliffy/command";
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
import { AdmLevelCode } from "@scope/consts/models";
import {
  injectCommunesDML,
  injectDbConnection,
  injectDistrictsDML,
  injectFokontanysDML,
  injectMadaAdmConfigDML,
  injectProvincesDML,
  injectRegionsDML,
} from "@scope/db";

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

const admLevelType = new EnumType(
  [
    AdmLevelCode.PROVINCE,
    AdmLevelCode.REGION,
    AdmLevelCode.DISTRICT,
    AdmLevelCode.COMMUNE,
    AdmLevelCode.FOKONTANY,
  ] as const,
);

const fieldType = new EnumType(
  [
    AdmLevelCode.PROVINCE,
    AdmLevelCode.REGION,
    AdmLevelCode.DISTRICT,
    AdmLevelCode.COMMUNE,
    AdmLevelCode.FOKONTANY,
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
      .action(async (options, admLevel, field) => {
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
      });
  }

  private enforceAdmLevelIdentifiers(
    admLevel: AdmLevelCode,
    identifiers: UpdateFieldIdentifiersCliConfig,
  ): AdmLevelIdentifiers {
    switch (admLevel) {
      case AdmLevelCode.PROVINCE: {
        if (!identifiers.province) {
          throw new Error("Province is required");
        }
        return {
          admLevel: AdmLevelCode.PROVINCE,
          province: identifiers.province,
        };
      }
      case AdmLevelCode.REGION: {
        if (!identifiers.region) {
          throw new Error("Region is required");
        }
        return { admLevel: AdmLevelCode.REGION, region: identifiers.region };
      }
      case AdmLevelCode.DISTRICT: {
        if (!identifiers.district?.value || !identifiers.district?.region) {
          throw new Error("District and region are required");
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
          throw new Error("Commune, district and region are required");
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
          throw new Error(
            "Fokontany, commune, district and region are required",
          );
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
        throw new Error(`Invalid adm level: ${admLevel satisfies never}`);
      }
    }
  }

  private async handleUpdateAdmLevelField(
    options: GlobalCliConfig,
    identifiers: AdmLevelIdentifiers,
    value: string,
  ) {
    const db = injectDbConnection(options.dbType);
    const madaAdmConfigDML = injectMadaAdmConfigDML(options.dbType, db, {
      pgSchema: options.pg?.schema,
    });

    const config = await madaAdmConfigDML.get();
    if (!config) {
      throw new Error(
        "Mada ADM configuration not found. Run index command first.",
      );
    }

    switch (identifiers.admLevel) {
      case AdmLevelCode.PROVINCE: {
        const dml = injectProvincesDML(config, options.dbType, db, {
          pgSchema: options.pg?.schema,
        });
        await dml.updateFieldByAttributes(identifiers, value);
        break;
      }
      case AdmLevelCode.REGION: {
        const dml = injectRegionsDML(config, options.dbType, db, {
          pgSchema: options.pg?.schema,
        });
        await dml.updateFieldByAttributes(identifiers, value);
        break;
      }
      case AdmLevelCode.DISTRICT: {
        const dml = injectDistrictsDML(config, options.dbType, db, {
          pgSchema: options.pg?.schema,
        });
        await dml.updateFieldByAttributes(identifiers, value);
        break;
      }
      case AdmLevelCode.COMMUNE: {
        const dml = injectCommunesDML(config, options.dbType, db, {
          pgSchema: options.pg?.schema,
        });
        await dml.updateFieldByAttributes(identifiers, value);
        break;
      }
      case AdmLevelCode.FOKONTANY: {
        const dml = injectFokontanysDML(config, options.dbType, db, {
          pgSchema: options.pg?.schema,
        });
        await dml.updateFieldByAttributes(identifiers, value);
        break;
      }
    }

    console.log(
      `Successfully updated ${identifiers.admLevel} field with identifiers: ${
        JSON.stringify(identifiers)
      } to ${value}.`,
    );
  }

  private handleUpdateAdmLevelGeojsonField(
    _options: GlobalCliConfig,
    _identifiers: AdmLevelIdentifiers,
    _value: string,
  ) {
    throw new Error(
      "GeoJSON updating is not yet implemented in the CLI or database adapters.",
    );
  }
}

let _command: CliUpdateFieldCommand | null = null;

export function injectCliUpdateFieldCommand() {
  if (_command === null) {
    _command = new CliUpdateFieldCommand();
  }
  return _command;
}
