import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import { BaseAdmTableSqliteDML } from "./adm-table.sqlite.dml.ts";
import type {
  DbTransactionContext,
  DMLCreateManyResult,
  DMLUpdateResult,
  EntityId,
  FokontanyTableDML,
} from "@scope/types/db";
import type {
  Fokontany,
  FokontanyAttributes,
  FokontanyRecord,
  MadaAdmConfigValues,
} from "@scope/types/models";
import type { SqliteDbConnection } from "../sqlite-db.connection.ts";

/**
 * SQLite DML implementation for the fokontanys table.
 */
export class FokontanysSqliteDML extends BaseAdmTableSqliteDML
  implements FokontanyTableDML {
  constructor(
    config: MadaAdmConfigValues,
    db: SqliteDbConnection,
  ) {
    super(config, db);
  }

  getManyByAttributes(
    attributes: FokontanyAttributes[],
    transactionContext?: DbTransactionContext,
  ): Fokontany[] {
    return this._getManyByAttributes(
      AdmLevelCode.FOKONTANY,
      attributes,
      transactionContext,
    ) as Fokontany[];
  }

  getManyByCommuneIds(
    communeIds: EntityId[],
    _transactionContext?: DbTransactionContext,
  ): Fokontany[] {
    return this._getManyByParentsIds(
      AdmLevelCode.FOKONTANY,
      communeIds,
    ) as Fokontany[];
  }

  updateFieldByIds(
    ids: EntityId[],
    fieldCode:
      | AdmLevelCode.FOKONTANY
      | AdmLevelCode.COMMUNE
      | AdmLevelCode.DISTRICT
      | AdmLevelCode.REGION
      | AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    const column = ADM_LEVEL_TITLE_BY_CODE.get(fieldCode)!;
    return this._updateFieldByIds(
      AdmLevelCode.FOKONTANY,
      ids,
      column,
      value,
      transactionContext,
    );
  }

  createMany(values: FokontanyRecord[]): DMLCreateManyResult {
    return this._createMany(AdmLevelCode.FOKONTANY, values);
  }

  deleteDuplicates(): void {
    this._deleteDuplicates(AdmLevelCode.FOKONTANY);
  }

  updateGeojsonByAttributes(
    attributes: FokontanyAttributes,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    return this._updateGeojsonByIdentifiers(
      AdmLevelCode.FOKONTANY,
      attributes,
      geojson,
      transactionContext,
    );
  }
}

let _instance: FokontanysSqliteDML | null = null;

export function injectFokontanysSqliteDML(
  config: MadaAdmConfigValues,
  db: SqliteDbConnection,
): FokontanysSqliteDML {
  if (!_instance) {
    _instance = new FokontanysSqliteDML(config, db);
  }
  return _instance;
}

export function resetFokontanysSqliteDML(): void {
  _instance = null;
}
