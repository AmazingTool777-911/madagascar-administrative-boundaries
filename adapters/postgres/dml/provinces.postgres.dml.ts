import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { mapProvinceSnakeToCamel } from "@scope/helpers/models";
import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type {
  DbTransactionContext,
  DMLCreateManyResult,
  DMLUpdateResult,
  EntityId,
  ProvinceTableDML,
} from "@scope/types/db";
import { DbHelper } from "@scope/helpers";
import type {
  MadaAdmConfigValues,
  Province,
  ProvinceRecord,
  ProvinceSnakedCased,
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

  async getManyByNames(
    names: string[],
    transactionContext?: DbTransactionContext,
  ): Promise<Province[]> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );
    const client = DbHelper.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? transactionContext.tx
      : this.db.client;
    const query = `SELECT * FROM ${tableName} WHERE LOWER(province) = ANY($1)`;
    const result = await client.queryObject<ProvinceSnakedCased>(
      query,
      [names.map((n) => n.toLowerCase())],
    );
    return result.rows.map(mapProvinceSnakeToCamel);
  }

  /**
   * Inserts multiple province records into the database in a single transaction.
   *
   * @param values - An array of province values to insert.
   * @returns A result object containing the count of inserted rows.
   */

  /**
   * Updates the province name of all province records whose IDs belong to the provided set.
   *
   * @param ids - The province IDs to target.
   * @param value - The new province name value to assign.
   */
  async updateFieldByIds(
    ids: EntityId[],
    fieldCode: AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): Promise<DMLUpdateResult> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );
    const column = ADM_LEVEL_TITLE_BY_CODE.get(fieldCode)!;
    return await this._updateFieldByIds(
      tableName,
      column,
      value,
      ids,
      transactionContext,
    );
  }

  async createMany(values: ProvinceRecord[]): Promise<DMLCreateManyResult> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );
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
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );
    await this._deleteDuplicates(tableName, ["province"]);
  }

  async updateGeojsonByName(
    name: string,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): Promise<DMLUpdateResult> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );
    return await this._updateGeojsonByIdentifiers(
      tableName,
      { province: name },
      geojson,
      "province",
      transactionContext,
    );
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
