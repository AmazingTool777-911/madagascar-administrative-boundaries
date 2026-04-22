import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type { DMLCreateManyResult, ProvinceTableDML } from "@scope/types/db";
import type {
  MadaAdmConfigValues,
  Province,
  ProvinceRecord,
} from "@scope/types/models";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * PostgreSQL DML implementation for the provinces table.
 */
export class ProvincesPostgresDML extends BaseAdmPostgresTableDML
  implements ProvinceTableDML {
  constructor(
    config: MadaAdmConfigValues,
    db: PostgresDbConnection,
    schema: string = "public",
  ) {
    super(config, db, schema);
  }

  async getManyByNames(names: string[]): Promise<Province[]> {
    const tableName = this.getTableName("provinces");
    const query = `SELECT * FROM ${tableName} WHERE province = ANY($1)`;
    const result = await this.db.client.queryObject<Province>(query, [names]);
    return result.rows;
  }

  /**
   * Inserts multiple province records into the database in a single transaction.
   *
   * @param values - An array of province values to insert.
   * @returns A result object containing the count of inserted rows.
   */
  async createMany(values: ProvinceRecord[]): Promise<DMLCreateManyResult> {
    const tableName = this.getTableName("provinces");
    const columns = ["province"];
    if (this.config.hasAdmLevel) columns.push("adm_level");
    if (this.config.hasGeojson) columns.push("geojson");

    return await this._createMany(
      tableName,
      columns,
      values,
      (val, argIndex) => {
        const placeholders: string[] = [];
        const args: unknown[] = [];

        // province
        placeholders.push(`$${argIndex++}`);
        args.push(val.province);

        // adm_level
        if (this.config.hasAdmLevel) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.admLevel ?? 0);
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
    const tableName = this.getTableName("provinces");
    await this._deleteDuplicates(tableName, ["province"]);
  }
}

let _instance: ProvincesPostgresDML | null = null;

/**
 * Injector for the ProvincesPostgresDML singleton.
 *
 * @param config - The runtime ADM configuration.
 * @param db - The singleton PostgreSQL database connection.
 * @param schema - The ADM schema binding.
 * @returns The singleton instance of ProvincesPostgresDML.
 */
export function injectProvincesPostgresDML(
  config: MadaAdmConfigValues,
  db: PostgresDbConnection,
  schema: string = "public",
): ProvincesPostgresDML {
  if (!_instance) {
    _instance = new ProvincesPostgresDML(config, db, schema);
  }
  return _instance;
}
