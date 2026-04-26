import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { mapCommuneSnakeToCamel } from "@scope/helpers/models";
import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type {
  CommuneAttributes,
  CommuneTableDML,
  DMLCreateManyResult,
} from "@scope/types/db";
import type {
  Commune,
  CommuneRecord,
  CommuneSnakeCased,
  MadaAdmConfigValues,
} from "@scope/types/models";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * PostgreSQL DML implementation for the communes table.
 */
export class CommunesPostgresDML extends BaseAdmPostgresTableDML
  implements CommuneTableDML {
  constructor(
    config: MadaAdmConfigValues,
    db: PostgresDbConnection,
    schema: string = "public",
  ) {
    super(config, db, schema);
  }

  async getManyByAttributes(
    attributes: CommuneAttributes[],
  ): Promise<Commune[]> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.COMMUNE)! + "s",
    );

    const columns = [
      `${tableName}.id`,
      `${tableName}.commune`,
      `${tableName}.district`,
      `${tableName}.region`,
      `${tableName}.district_id`,
      `${tableName}.created_at`,
      `${tableName}.updated_at`,
    ];

    if (this.config.isProvinceRepeated) columns.push(`${tableName}.province`);
    if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
      columns.push(`${tableName}.province_id`);
    }
    if (this.config.isFkRepeated) columns.push(`${tableName}.region_id`);
    if (this.config.hasAdmLevel) columns.push(`${tableName}.adm_level`);
    if (this.config.hasGeojson) {
      columns.push(`ST_AsGeoJSON(${tableName}.geojson) as geojson`);
    }

    return await this._getManyByAttributes<Commune, CommuneSnakeCased>(
      tableName,
      columns,
      attributes,
      mapCommuneSnakeToCamel,
      "commune",
    );
  }

  /**
   * Inserts multiple commune records into the database in a single transaction.
   *
   * @param values - An array of commune values to insert.
   * @returns A result object containing the count of inserted rows.
   */
  async createMany(values: CommuneRecord[]): Promise<DMLCreateManyResult> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.COMMUNE)! + "s",
    );
    const columns = ["commune", "district", "region", "district_id"];

    if (this.config.isProvinceRepeated) columns.push("province");
    if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
      columns.push("province_id");
    }
    if (this.config.isFkRepeated) columns.push("region_id");
    if (this.config.hasAdmLevel) columns.push("adm_level");
    if (this.config.hasGeojson) columns.push("geojson");

    return await this._createMany(
      tableName,
      columns,
      values,
      (val, argIndex) => {
        const placeholders: string[] = [];
        const args: unknown[] = [];

        // commune
        placeholders.push(`$${argIndex++}`);
        args.push(val.commune);

        // district
        placeholders.push(`$${argIndex++}`);
        args.push(val.district);

        // region
        placeholders.push(`$${argIndex++}`);
        args.push(val.region);

        // district_id
        placeholders.push(`$${argIndex++}`);
        args.push(val.districtId);

        // province
        if (this.config.isProvinceRepeated) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.province);
        }

        // province_id
        if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.provinceId);
        }

        // region_id
        if (this.config.isFkRepeated) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.regionId);
        }

        // adm_level
        if (this.config.hasAdmLevel) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.admLevel ?? 3);
        }

        // geojson
        if (this.config.hasGeojson) {
          placeholders.push(`ST_GeomFromGeoJSON($${argIndex++})`);
          args.push(val.geojson ? JSON.stringify(val.geojson) : null);
        }

        return { placeholders, args };
      },
    );
  }

  async deleteDuplicates(): Promise<void> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.COMMUNE)! + "s",
    );
    await this._deleteDuplicates(tableName, ["commune", "district", "region"]);
  }
}

let _instance: CommunesPostgresDML | null = null;

/**
 * Injector for the CommunesPostgresDML singleton.
 *
 * @param config - The runtime ADM configuration.
 * @param db - The singleton PostgreSQL database connection.
 * @param schema - The ADM schema binding.
 * @returns The singleton instance of CommunesPostgresDML.
 */
export function injectCommunesPostgresDML(
  config: MadaAdmConfigValues,
  db: PostgresDbConnection,
  schema: string = "public",
): CommunesPostgresDML {
  if (!_instance) {
    _instance = new CommunesPostgresDML(config, db, schema);
  }
  return _instance;
}
