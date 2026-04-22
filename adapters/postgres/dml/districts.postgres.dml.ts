import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type { DistrictTableDML, DMLCreateManyResult } from "@scope/types/db";
import type { DistrictRecord, MadaAdmConfigValues } from "@scope/types/models";
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

  /**
   * Inserts multiple district records into the database in a single transaction.
   *
   * @param values - An array of district values to insert.
   * @returns A result object containing the count of inserted rows.
   */
  async createMany(values: DistrictRecord[]): Promise<DMLCreateManyResult> {
    const tableName = this.getTableName("districts");
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
    const tableName = this.getTableName("districts");
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
