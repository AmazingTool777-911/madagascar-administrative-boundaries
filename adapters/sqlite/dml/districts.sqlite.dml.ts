import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { BaseAdmTableSqliteDML } from "./adm-table.sqlite.dml.ts";
import type {
  DbTransactionContext,
  DistrictTableDML,
  DMLCreateManyResult,
  DMLUpdateResult,
  EntityId,
} from "@scope/types/db";
import type {
  District,
  DistrictAttributes,
  DistrictRecord,
  MadaAdmConfigValues,
} from "@scope/types/models";
import type { SqliteDbConnection } from "../sqlite-db.connection.ts";

/**
 * SQLite DML implementation for the districts table.
 */
export class DistrictsSqliteDML extends BaseAdmTableSqliteDML
  implements DistrictTableDML {
  constructor(
    config: MadaAdmConfigValues,
    db: SqliteDbConnection,
  ) {
    super(config, db);
  }

  getManyByAttributes(
    attributes: DistrictAttributes[],
    transactionContext?: DbTransactionContext,
  ): District[] {
    return this._getManyByAttributes(
      AdmLevelCode.DISTRICT,
      attributes,
      transactionContext,
    ) as District[];
  }

  getManyByRegionIds(
    regionIds: EntityId[],
    _transactionContext?: DbTransactionContext,
  ): District[] {
    return this._getManyByParentsIds(
      AdmLevelCode.DISTRICT,
      regionIds,
    ) as District[];
  }

  updateFieldByIds(
    ids: EntityId[],
    fieldCode:
      | AdmLevelCode.DISTRICT
      | AdmLevelCode.REGION
      | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    const column = ADM_LEVEL_TITLE_BY_CODE.get(fieldCode)!;
    return this._updateFieldByIds(
      AdmLevelCode.DISTRICT,
      ids,
      column,
      value,
      transactionContext,
    );
  }

  createMany(values: DistrictRecord[]): DMLCreateManyResult {
    return this._createMany(AdmLevelCode.DISTRICT, values);
  }

  deleteDuplicates(): void {
    this._deleteDuplicates(AdmLevelCode.DISTRICT);
  }

  updateGeojsonByAttributes(
    attributes: DistrictAttributes,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    return this._updateGeojsonByIdentifiers(
      AdmLevelCode.DISTRICT,
      attributes,
      geojson,
      transactionContext,
    );
  }
}

let _instance: DistrictsSqliteDML | null = null;

export function injectDistrictsSqliteDML(
  config: MadaAdmConfigValues,
  db: SqliteDbConnection,
): DistrictsSqliteDML {
  if (!_instance) {
    _instance = new DistrictsSqliteDML(config, db);
  }
  return _instance;
}

export function resetDistrictsSqliteDML(): void {
  _instance = null;
}
