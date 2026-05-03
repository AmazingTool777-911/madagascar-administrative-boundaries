import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { BaseAdmTableSqliteDML } from "./adm-table.sqlite.dml.ts";
import type {
  DbTransactionContext,
  DMLCreateManyResult,
  DMLUpdateResult,
  EntityId,
  RegionTableDML,
} from "@scope/types/db";
import type {
  MadaAdmConfigValues,
  Region,
  RegionRecord,
} from "@scope/types/models";
import type { SqliteDbConnection } from "../sqlite-db.connection.ts";

/**
 * SQLite DML implementation for the regions table.
 */
export class RegionsSqliteDML extends BaseAdmTableSqliteDML
  implements RegionTableDML {
  constructor(
    config: MadaAdmConfigValues,
    db: SqliteDbConnection,
  ) {
    super(config, db);
  }

  getManyByNames(
    names: string[],
    transactionContext?: DbTransactionContext,
  ): Region[] {
    return this._getManyByAttributes(
      AdmLevelCode.REGION,
      names.map((n) => ({ region: n })),
      transactionContext,
    ) as Region[];
  }

  getManyByProvinceIds(
    provinceIds: EntityId[],
    _transactionContext?: DbTransactionContext,
  ): Region[] {
    return this._getManyByParentsIds(
      AdmLevelCode.REGION,
      provinceIds,
    ) as Region[];
  }

  updateFieldByIds(
    ids: EntityId[],
    fieldCode: AdmLevelCode.REGION | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    const column = ADM_LEVEL_TITLE_BY_CODE.get(fieldCode)!;
    return this._updateFieldByIds(
      AdmLevelCode.REGION,
      ids,
      column,
      value,
      transactionContext,
    );
  }

  createMany(values: RegionRecord[]): DMLCreateManyResult {
    return this._createMany(AdmLevelCode.REGION, values);
  }

  deleteDuplicates(): void {
    this._deleteDuplicates(AdmLevelCode.REGION);
  }

  updateGeojsonByName(
    name: string,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    return this._updateGeojsonByIdentifiers(
      AdmLevelCode.REGION,
      { region: name },
      geojson,
      transactionContext,
    );
  }
}

let _instance: RegionsSqliteDML | null = null;

export function injectRegionsSqliteDML(
  config: MadaAdmConfigValues,
  db: SqliteDbConnection,
): RegionsSqliteDML {
  if (!_instance) {
    _instance = new RegionsSqliteDML(config, db);
  }
  return _instance;
}

export function resetRegionsSqliteDML(): void {
  _instance = null;
}
