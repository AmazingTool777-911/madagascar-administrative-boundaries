import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { mapProvinceSnakeToCamel } from "@scope/helpers/models";
import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type {
  DbTransactionContext,
  DMLCreateManyResult,
  ProvinceAttributes,
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
   * Updates the province name of the record identified by the given attributes.
   *
   * @param attributes - The unique identifying attributes of the province.
   * @param value - The new province name value to assign.
   */
  async updateFieldByAttributes(
    attributes: ProvinceAttributes,
    value: string,
    transactionContext?: DbTransactionContext,
  ): Promise<void> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.PROVINCE)! + "s",
    );
    const client = DbHelper.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? transactionContext.tx
      : this.db.client;
    const sql = `
      UPDATE ${tableName}
      SET province = $1
      WHERE LOWER(province) = LOWER($2);
    `;
    await client.queryObject(sql, [value, attributes.province]);
  }

  /**
   * Inserts multiple province records into the database in a single transaction.
   *
   * @param values - An array of province values to insert.
   * @returns A result object containing the count of inserted rows.
   */
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
