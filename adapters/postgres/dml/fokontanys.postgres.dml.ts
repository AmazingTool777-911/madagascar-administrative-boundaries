import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type { DMLCreateManyResult, FokontanyTableDML } from "@scope/types/db";
import type { FokontanyRecord, MadaAdmConfigValues } from "@scope/types/models";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * PostgreSQL DML implementation for the fokontanys table.
 */
export class FokontanysPostgresDML extends BaseAdmPostgresTableDML
  implements FokontanyTableDML {
  constructor(
    config: MadaAdmConfigValues,
    db: PostgresDbConnection,
    schema: string = "public",
  ) {
    super(config, db, schema);
  }

  /**
   * Inserts multiple fokontany records into the database in a single transaction.
   *
   * @param values - An array of fokontany values to insert.
   * @returns A result object containing the count of inserted rows.
   */
  async createMany(values: FokontanyRecord[]): Promise<DMLCreateManyResult> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.FOKONTANY)! + "s",
    );
    const columns = [
      "fokontany",
      "commune",
      "district",
      "region",
      "commune_id",
    ];

    if (this.config.isProvinceRepeated) columns.push("province");
    if (this.config.isFkRepeated || this.config.isProvinceFkRepeated) {
      columns.push("province_id");
    }
    if (this.config.isFkRepeated) {
      columns.push("region_id");
      columns.push("district_id");
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

        // fokontany
        placeholders.push(`$${argIndex++}`);
        args.push(val.fokontany);

        // commune
        placeholders.push(`$${argIndex++}`);
        args.push(val.commune);

        // district
        placeholders.push(`$${argIndex++}`);
        args.push(val.district);

        // region
        placeholders.push(`$${argIndex++}`);
        args.push(val.region);

        // commune_id
        placeholders.push(`$${argIndex++}`);
        args.push(val.communeId);

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

        // region_id & district_id
        if (this.config.isFkRepeated) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.regionId);
          placeholders.push(`$${argIndex++}`);
          args.push(val.districtId);
        }

        // adm_level
        if (this.config.hasAdmLevel) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.admLevel ?? 4);
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
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.FOKONTANY)! + "s",
    );
    await this._deleteDuplicates(tableName, [
      "fokontany",
      "commune",
      "district",
      "region",
    ]);
  }
}

let _instance: FokontanysPostgresDML | null = null;

/**
 * Injector for the FokontanysPostgresDML singleton.
 *
 * @param config - The runtime ADM configuration.
 * @param db - The singleton PostgreSQL database connection.
 * @param schema - The ADM schema binding.
 * @returns The singleton instance of FokontanysPostgresDML.
 */
export function injectFokontanysPostgresDML(
  config: MadaAdmConfigValues,
  db: PostgresDbConnection,
  schema: string = "public",
): FokontanysPostgresDML {
  if (!_instance) {
    _instance = new FokontanysPostgresDML(config, db, schema);
  }
  return _instance;
}
