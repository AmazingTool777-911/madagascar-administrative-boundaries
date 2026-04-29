import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { mapCommuneSnakeToCamel } from "@scope/helpers/models";
import { BaseAdmPostgresTableDML } from "./adm-table.postgres.dml.ts";
import type {
  CommuneTableDML,
  DbTransactionContext,
  DMLCreateManyResult,
  EntityId,
} from "@scope/types/db";
import { DbHelper } from "@scope/helpers";
import type {
  Commune,
  CommuneAttributes,
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
    transactionContext?: DbTransactionContext,
  ): Promise<Commune[]> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.COMMUNE)! + "s",
    );

    return await this._getManyByAttributes<Commune, CommuneSnakeCased>(
      tableName,
      [`${tableName}.*`],
      attributes,
      mapCommuneSnakeToCamel,
      "commune",
      transactionContext,
    );
  }

  /**
   * Retrieves multiple communes whose nearest parent district ID is among the provided set.
   *
   * @param districtIds - The district IDs to filter by.
   * @returns An array of matching commune entities.
   */
  async getManyByDistrictIds(
    districtIds: EntityId[],
    transactionContext?: DbTransactionContext,
  ): Promise<Commune[]> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.COMMUNE)! + "s",
    );
    return await this._getManyByParentId<Commune, CommuneSnakeCased>(
      tableName,
      [`${tableName}.*`],
      "district_id",
      districtIds,
      mapCommuneSnakeToCamel,
      transactionContext,
    );
  }

  /**
   * Updates the commune name of the record identified by the given attributes.
   *
   * @param attributes - The unique identifying attributes of the commune.
   * @param value - The new commune name value to assign.
   */
  async updateFieldByAttributes(
    attributes: CommuneAttributes,
    value: string,
    transactionContext?: DbTransactionContext,
  ): Promise<void> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.COMMUNE)! + "s",
    );
    const client = DbHelper.ensureIsPostgresDbTransactionCtx(transactionContext)
      ? transactionContext.tx
      : this.db.client;
    const sql = `
      UPDATE ${tableName}
      SET commune = $1
      WHERE LOWER(commune) = LOWER($2)
        AND LOWER(district) = LOWER($3)
        AND LOWER(region) = LOWER($4);
    `;
    await client.queryObject(sql, [
      value,
      attributes.commune,
      attributes.district,
      attributes.region,
    ]);
  }

  /**
   * Updates the commune name of all commune records whose IDs belong to the provided set.
   *
   * @param ids - The commune IDs to target.
   * @param value - The new commune name value to assign.
   */
  async updateFieldByIds(
    ids: EntityId[],
    value: string,
    transactionContext?: DbTransactionContext,
  ): Promise<void> {
    const tableName = this.getTableName(
      ADM_LEVEL_TITLE_BY_CODE.get(AdmLevelCode.COMMUNE)! + "s",
    );
    await this._updateFieldByIds(
      tableName,
      "commune",
      value,
      ids,
      transactionContext,
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
