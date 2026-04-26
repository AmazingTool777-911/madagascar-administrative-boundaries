import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { mapDistrictSnakeToCamel } from "@scope/helpers/models";
import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type {
  DistrictAttributes,
  DistrictTableDML,
  DMLCreateManyResult,
} from "@scope/types/db";
import type {
  District,
  DistrictRecord,
  DistrictSnakeCased,
  MadaAdmConfigValues,
} from "@scope/types/models";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * PostgreSQL DML implementation for the districts table.
 */
export class DistrictsPostgresDML extends BaseAdmPostgresTableDML
  implements DistrictTableDML {
  constructor(
    config: MadaAdmConfigValues,
    db: PostgresDbConnection,
    schema: string = "public",
  ) {
    super(config, db, schema);
  }

  async getByAttributes(
    attributes: DistrictAttributes,
  ): Promise<District | null> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.DISTRICT)! + "s",
    );
    const query =
      `SELECT * FROM ${tableName} WHERE district = $1 AND region = $2`;
    const result = await this.db.client.queryObject<DistrictSnakeCased>(query, [
      attributes.district,
      attributes.region,
    ]);

    if (result.rows.length === 0) return null;
    return mapDistrictSnakeToCamel(result.rows[0]);
  }

  /**
   * Inserts multiple district records into the database in a single transaction.
   *
   * @param values - An array of district values to insert.
   * @returns A result object containing the count of inserted rows.
   */
  async createMany(values: DistrictRecord[]): Promise<DMLCreateManyResult> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.DISTRICT)! + "s",
    );
    const columns = ["district", "region", "region_id"];

    if (this.config.isProvinceRepeated) columns.push("province");
    if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
      columns.push("province_id");
    }
    if (this.config.hasAdmLevel) columns.push("adm_level");
    if (this.config.hasGeojson) columns.push("geojson");

    return await this._createMany(
      tableName,
      columns,
      values,
      (val, argIndex) => {
        const placeholders: string[] = [];
        const args: unknown[] = [];

        // district
        placeholders.push(`$${argIndex++}`);
        args.push(val.district);

        // region
        placeholders.push(`$${argIndex++}`);
        args.push(val.region);

        // region_id
        placeholders.push(`$${argIndex++}`);
        args.push(val.regionId);

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

        // adm_level
        if (this.config.hasAdmLevel) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.admLevel ?? 2);
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
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.DISTRICT)! + "s",
    );
    await this._deleteDuplicates(tableName, ["district", "region"]);
  }
}

let _instance: DistrictsPostgresDML | null = null;

/**
 * Injector for the DistrictsPostgresDML singleton.
 *
 * @param config - The runtime ADM configuration.
 * @param db - The singleton PostgreSQL database connection.
 * @param schema - The ADM schema binding.
 * @returns The singleton instance of DistrictsPostgresDML.
 */
export function injectDistrictsPostgresDML(
  config: MadaAdmConfigValues,
  db: PostgresDbConnection,
  schema: string = "public",
): DistrictsPostgresDML {
  if (!_instance) {
    _instance = new DistrictsPostgresDML(config, db, schema);
  }
  return _instance;
}
