import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { mapRegionSnakeToCamel } from "@scope/helpers/models";
import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type {
  DbTransactionContext,
  DMLCreateManyResult,
  EntityId,
  RegionAttributes,
  RegionTableDML,
} from "@scope/types/db";
import { DbHelper } from "@scope/helpers";
import type {
  MadaAdmConfigValues,
  Region,
  RegionRecord,
  RegionSnakeCased,
} from "@scope/types/models";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * PostgreSQL DML implementation for the regions table.
 */
export class RegionsPostgresDML extends BaseAdmPostgresTableDML
  implements RegionTableDML {
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
  ): Promise<Region[]> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.REGION)! + "s",
    );
    const client = DbHelper.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? transactionContext.tx
      : this.db.client;
    const query = `SELECT * FROM ${tableName} WHERE LOWER(region) = ANY($1)`;
    const result = await client.queryObject<RegionSnakeCased>(query, [
      names.map((n) => n.toLowerCase()),
    ]);
    return result.rows.map(mapRegionSnakeToCamel);
  }

  /**
   * Retrieves multiple regions whose nearest parent province ID is among the provided set.
   *
   * @param provinceIds - The province IDs to filter by.
   * @returns An array of matching region entities.
   */
  async getManyByProvinceIds(
    provinceIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): Promise<Region[]> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.REGION)! + "s",
    );
    return await this._getManyByParentId<Region, RegionSnakeCased>(
      tableName,
      [`${tableName}.*`],
      "province_id",
      provinceIds,
      mapRegionSnakeToCamel,
      transactionContext,
    );
  }

  /**
   * Updates the region name of the record identified by the given attributes.
   *
   * @param attributes - The unique identifying attributes of the region.
   * @param value - The new region name value to assign.
   */
  async updateFieldByAttributes(
    attributes: RegionAttributes,
    value: string,
    transactionContext?: DbTransactionContext,
  ): Promise<void> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.REGION)! + "s",
    );
    const client = DbHelper.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? transactionContext.tx
      : this.db.client;
    const sql = `
      UPDATE ${tableName}
      SET region = $1
      WHERE LOWER(region) = LOWER($2);
    `;
    await client.queryObject(sql, [value, attributes.region]);
  }

  /**
   * Updates the region name of all region records whose IDs belong to the provided set.
   *
   * @param ids - The region IDs to target.
   * @param value - The new region name value to assign.
   */
  async updateFieldByIds(
    ids: EntityId[],
    value: string,
    transactionContext?: DbTransactionContext,
  ): Promise<void> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.REGION)! + "s",
    );
    await this._updateFieldByIds(
      tableName,
      "region",
      value,
      ids,
      transactionContext,
    );
  }

  /**
   * Inserts multiple region records into the database in a single transaction.
   *
   * @param values - An array of region values to insert.
   * @returns A result object containing the count of inserted rows.
   */
  async createMany(values: RegionRecord[]): Promise<DMLCreateManyResult> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.REGION)! + "s",
    );
    const columns = ["region", "province", "province_id"];
    if (this.config.hasAdmLevel) columns.push("adm_level");
    if (this.config.hasGeojson) columns.push("geojson");

    return await this._createMany(
      tableName,
      columns,
      values,
      (val, argIndex) => {
        const placeholders: string[] = [];
        const args: unknown[] = [];

        // region
        placeholders.push(`$${argIndex++}`);
        args.push(val.region);

        // province
        placeholders.push(`$${argIndex++}`);
        args.push(val.province);

        // province_id
        placeholders.push(`$${argIndex++}`);
        args.push(val.provinceId);

        // adm_level
        if (this.config.hasAdmLevel) {
          placeholders.push(`$${argIndex++}`);
          args.push(val.admLevel ?? 1);
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
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.REGION)! + "s",
    );
    await this._deleteDuplicates(tableName, ["region"]);
  }
}

let _instance: RegionsPostgresDML | null = null;

/**
 * Injector for the RegionsPostgresDML singleton.
 *
 * @param config - The runtime ADM configuration.
 * @param db - The singleton PostgreSQL database connection.
 * @param schema - The ADM schema binding.
 * @returns The singleton instance of RegionsPostgresDML.
 */
export function injectRegionsPostgresDML(
  config: MadaAdmConfigValues,
  db: PostgresDbConnection,
  schema: string = "public",
): RegionsPostgresDML {
  if (!_instance) {
    _instance = new RegionsPostgresDML(config, db, schema);
  }
  return _instance;
}
