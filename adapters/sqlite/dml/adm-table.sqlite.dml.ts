import type {
  AdmAttributes,
  AdmRecord,
  MadaAdmConfigValues,
  ProvinceSnakeCased,
} from "@scope/types/models";
import type { SqliteDbConnection } from "@scope/adapters/sqlite";
import { StringUtils } from "@scope/utils";
import {
  ADM_LEVEL_CODES_INDEXED,
  ADM_LEVEL_INDEX_BY_CODE,
  ADM_LEVEL_TITLE_BY_CODE,
  AdmLevelCode,
} from "@scope/consts/models";
import type {
  AdmEntity,
  AdmEntitySnakeCased,
  CommuneSnakeCased,
  DistrictSnakeCased,
  FokontanySnakeCased,
  RegionSnakeCased,
} from "@scope/types/models";
import type {
  DbTransactionContext,
  DMLCreateManyResult,
  DMLUpdateResult,
  EntityId,
} from "@scope/types/db";
import { ensureIsSqliteDbTransactionCtx } from "@scope/helpers/db";
import {
  isGeoJSONGeometry,
  mapCommuneSnakeToCamel,
  mapDistrictSnakeToCamel,
  mapFokontanySnakeToCamel,
  mapProvinceSnakeToCamel,
  mapRegionSnakeToCamel,
} from "@scope/helpers/models";
import { camelToSnakeCase } from "../../../utils/string.utils.ts";

/**
 * Base class for SQLite Data Manipulation Layer (DML) implementations
 * for administrative tables.
 */
export class BaseAdmTableSqliteDML {
  constructor(
    protected config: MadaAdmConfigValues,
    protected db: SqliteDbConnection,
  ) {
  }

  /**
   * Generates the physical database table name by applying
   * the prefix from the configuration.
   *
   * @param baseName - The base name of the administrative table (e.g., 'regions').
   * @returns The resolved table name (e.g., 'mada_regions').
   */
  protected getTableName(baseName: string): string {
    return StringUtils.prefixWithSnakeCase(
      this.config.tablesPrefix,
      baseName,
    );
  }

  /**
   * Fetches multiple administrative entities matching a list of attribute sets.
   *
   * @param admLevel - The administrative level to query.
   * @param attributesValues - A list of attribute sets (e.g., [{province: 'Antananarivo'}]).
   * @param transactionContext - Optional database transaction context.
   * @returns An array of mapped administrative entities.
   */
  protected _getManyByAttributes(
    admLevel: AdmLevelCode,
    attributesValues: AdmAttributes[],
    transactionContext?: DbTransactionContext,
  ) {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }
    if (attributesValues.length === 0) return [];
    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevel)!;
    const tableName = this.getTableName(`${admLevelTitle}s`);
    const attributes = Object.keys(attributesValues[0]);
    const values = attributesValues.map(
      (av) => attributes.map((attr) => av[attr]),
    );
    const columns = ["t.*"];
    if (this.config.hasGeojson) {
      columns.push("AsGeoJSON(t.geojson) as geojson");
    }
    const sql = `
			WITH v(${attributes.join(", ")}) AS (
				VALUES ${
      values.map((v) => "(" + v.map(() => "?").join(", ") + ")").join(", ")
    }
			)
			SELECT ${columns.join(", ")}
			FROM ${tableName} t
			JOIN v ON ${
      attributes.map((attr) => {
        const isTargetColumn = attr === admLevelTitle;
        const lhs = isTargetColumn ? `lower(t.${attr})` : `t.${attr}`;
        const rhs = isTargetColumn ? `lower(v.${attr})` : `v.${attr}`;
        return `${lhs} = ${rhs}`;
      }).join(" AND ")
    }
		`;
    const stmt = this.db.client.prepare(sql);
    const res = stmt.all(...values.flat()) as AdmEntitySnakeCased[];
    return res.map((r) => {
      switch (admLevel) {
        case AdmLevelCode.PROVINCE:
          return mapProvinceSnakeToCamel(r as ProvinceSnakeCased);
        case AdmLevelCode.REGION:
          return mapRegionSnakeToCamel(r as RegionSnakeCased);
        case AdmLevelCode.DISTRICT:
          return mapDistrictSnakeToCamel(r as DistrictSnakeCased);
        case AdmLevelCode.COMMUNE:
          return mapCommuneSnakeToCamel(r as CommuneSnakeCased);
        case AdmLevelCode.FOKONTANY:
          return mapFokontanySnakeToCamel(r as FokontanySnakeCased);
        default:
          throw new Error(
            `Unknown ADM level when getting ${admLevelTitle}: ${admLevel satisfies never} by attributes`,
          );
      }
    });
  }

  /**
   * Updates the GeoJSON data for a specific administrative entity identified by its attributes.
   *
   * @param admLevel - The administrative level of the entity (e.g., Province, Region).
   * @param identifiers - The attributes used to identify the entity (e.g., name, parent IDs).
   * @param geojson - The new GeoJSON string to set.
   * @param transactionContext - Optional database transaction context.
   * @returns An object containing the number of affected rows.
   */
  protected _updateGeojsonByIdentifiers(
    admLevel: AdmLevelCode,
    identifiers: AdmAttributes,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }
    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevel)!;
    const tableName = this.getTableName(`${admLevelTitle}s`);
    const attributes = Object.keys(identifiers);
    const values = Object.values(identifiers);
    const sql = `
			UPDATE ${tableName}
			SET geojson = SetSRID(GeomFromGeoJSON(?), 4326),
				updated_at = (datetime('now'))
			WHERE ${
      attributes.map((attr) => {
        const isTargetColumn = attr === admLevelTitle;
        const lhs = isTargetColumn ? `lower(${attr})` : attr;
        const rhs = isTargetColumn ? "lower(?)" : "?";
        return `${lhs} = ${rhs}`;
      }).join(" AND ")
    }
		`;
    const stmt = this.db.client.prepare(sql);
    const res = stmt.run(geojson, ...values);
    return { affectedRows: Number(res.changes) };
  }

  /**
   * Creates multiple administrative entities in the database.
   *
   * @param admLevel - The administrative level of the entity (e.g., Province, Region).
   * @param records - An array of administrative entities to create.
   * @returns An object containing the number of inserted rows.
   */
  protected _createMany(
    admLevel: AdmLevelCode,
    records: AdmRecord[],
  ): DMLCreateManyResult {
    if (records.length === 0) return { insertedCount: 0 };
    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevel)!;
    const tableName = this.getTableName(`${admLevelTitle}s`);
    const columns = Object.keys(records[0]).filter((attr) => {
      if (attr === "geojson") return this.config.hasGeojson;
      if (attr === "adm_level") return this.config.hasAdmLevel;
      if (
        [AdmLevelCode.DISTRICT, AdmLevelCode.COMMUNE, AdmLevelCode.FOKONTANY]
          .includes(admLevel)
      ) {
        if (attr === "province") return this.config.isProvinceRepeated;
        if (attr === "provinceId") return this.config.isProvinceFkRepeated;
      }
      if (admLevel === AdmLevelCode.COMMUNE && attr === "regionId") {
        return this.config.isFkRepeated;
      }
      if (
        admLevel === AdmLevelCode.FOKONTANY &&
        ["regionId", "districtId"].includes(attr)
      ) return this.config.isFkRepeated;
      return true;
    });
    const values = records.map((r) =>
      columns.map((c) => {
        const value = r[c as keyof AdmRecord]!;
        if (isGeoJSONGeometry(value)) return JSON.stringify(value);
        return value;
      })
    );

    const sql = `
			INSERT INTO ${tableName} (${
      columns.map((c) => camelToSnakeCase(c)).join(",")
    })
			VALUES ${
      values.map(() =>
        "(" + columns.map((c) =>
          c === "geojson" ? "SetSRID(GeomFromGeoJSON(?), 4326)" : "?"
        ).join(", ") + ")"
      ).join(", ")
    }
		`;
    const stmt = this.db.client.prepare(sql);
    const res = stmt.run(...values.flat());
    return { insertedCount: Number(res.changes) };
  }

  /**
   * Internal helper to delete duplicate records from a table.
   *
   * @param admLevel - The administrative level of the table.
   */
  protected _deleteDuplicates(admLevel: AdmLevelCode): void {
    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevel)!;
    const tableName = this.getTableName(`${admLevelTitle}s`);
    const partitionKeys: string[] = [`lower(${admLevelTitle})`];
    const regionAdmLevelIndex = ADM_LEVEL_INDEX_BY_CODE.get(
      AdmLevelCode.REGION,
    )!;
    if (ADM_LEVEL_INDEX_BY_CODE.get(admLevel)! > regionAdmLevelIndex) {
      const admLevelIndex = ADM_LEVEL_INDEX_BY_CODE.get(admLevel)!;
      for (let i = admLevelIndex - 1; i >= regionAdmLevelIndex; i--) {
        const parentAdmLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(
          ADM_LEVEL_CODES_INDEXED[i],
        )!;
        partitionKeys.push(`lower(${parentAdmLevelTitle})`);
      }
    }
    const sql = `
      WITH CTE AS (
				SELECT id, 
					ROW_NUMBER() OVER (
						PARTITION BY ${partitionKeys.join(", ")}
						ORDER BY id ASC
					) AS row_num
				FROM ${tableName}
      )
      DELETE FROM ${tableName}
      WHERE id IN (
        SELECT id FROM CTE WHERE row_num > 1
      );
    `;
    const stmt = this.db.client.prepare(sql);
    stmt.run();
  }

  /**
   * Retrieves multiple administrative entities by their parent IDs.
   *
   * @param admLevel - The administrative level of the entities to retrieve.
   * @param parentsIds - An array of parent entity IDs.
   * @returns An array of administrative entities.
   */
  protected _getManyByParentsIds(
    admLevel: AdmLevelCode,
    parentsIds: EntityId[],
  ): AdmEntity[] {
    if (admLevel === AdmLevelCode.PROVINCE) {
      throw new Error(`There is no parent for province`);
    }
    if (parentsIds.length === 0) return [];
    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevel)!;
    const tableName = this.getTableName(`${admLevelTitle}s`);
    const parentIdColumn = `${ADM_LEVEL_TITLE_BY_CODE.get(
      ADM_LEVEL_CODES_INDEXED[ADM_LEVEL_INDEX_BY_CODE.get(admLevel)! - 1],
    )!}_id`;
    const columns = ["t.*"];
    if (this.config.hasGeojson) {
      columns.push("AsGeoJSON(t.geojson) as geojson");
    }
    const sql = `
			SELECT ${columns.join(", ")}
			FROM ${tableName} t
			WHERE t.${parentIdColumn} IN (${parentsIds.map(() => "?").join(",")})
		`;
    const stmt = this.db.client.prepare(sql);
    const res = stmt.all(...parentsIds) as AdmEntitySnakeCased[];
    return res.map<AdmEntity>((r) => {
      switch (admLevel) {
        case AdmLevelCode.REGION:
          return mapRegionSnakeToCamel(r as RegionSnakeCased);
        case AdmLevelCode.DISTRICT:
          return mapDistrictSnakeToCamel(r as DistrictSnakeCased);
        case AdmLevelCode.COMMUNE:
          return mapCommuneSnakeToCamel(r as CommuneSnakeCased);
        case AdmLevelCode.FOKONTANY:
          return mapFokontanySnakeToCamel(r as FokontanySnakeCased);
        default:
          throw new Error(
            `Unknown ADM level when getting ${admLevelTitle}: ${admLevel satisfies never} by parents ids`,
          );
      }
    });
  }

  /**
   * Updates a specific field of multiple administrative entities by their IDs.
   * @param admLevel - The administrative level of the entities.
   * @param ids - An array of entity IDs.
   * @param column - The name of the field to update.
   * @param value - The new value for the field.
   * @param transactionContext - Optional transaction context.
   * @returns An object containing the number of affected rows.
   */
  protected _updateFieldByIds(
    admLevel: AdmLevelCode,
    ids: EntityId[],
    column: string,
    value: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    if (transactionContext) {
      ensureIsSqliteDbTransactionCtx(transactionContext);
    }
    const admLevelTitle = ADM_LEVEL_TITLE_BY_CODE.get(admLevel)!;
    const tableName = this.getTableName(`${admLevelTitle}s`);
    const sql = `
			UPDATE ${tableName}
			SET ${column} = ?,
			updated_at = (datetime('now'))
			WHERE id IN (${ids.map(() => "?").join(",")})
		`;
    const stmt = this.db.client.prepare(sql);
    const res = stmt.run(value, ...ids);
    return { affectedRows: Number(res.changes) };
  }
}
