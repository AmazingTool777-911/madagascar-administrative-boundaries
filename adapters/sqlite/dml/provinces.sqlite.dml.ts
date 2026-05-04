import { AdmLevelCode } from "@scope/consts/models";
import { BaseAdmTableSqliteDML } from "./adm-table.sqlite.dml.ts";
import type {
  DbTransactionContext,
  DMLCreateManyResult,
  DMLUpdateResult,
  EntityId,
  ProvinceTableDML,
} from "@scope/types/db";
import type {
  MadaAdmConfigValues,
  Province,
  ProvinceRecord,
} from "@scope/types/models";
import type { SqliteDbConnection } from "../sqlite-db.connection.ts";

/**
 * SQLite DML implementation for the provinces table.
 */
export class ProvincesSqliteDML extends BaseAdmTableSqliteDML
  implements ProvinceTableDML {
  constructor(
    config: MadaAdmConfigValues,
    db: SqliteDbConnection,
  ) {
    super(config, db);
  }

  getManyByNames(
    names: string[],
    transactionContext?: DbTransactionContext,
  ): Province[] {
    return this._getManyByAttributes(
      AdmLevelCode.PROVINCE,
      names.map((n) => ({ province: n })),
      transactionContext,
    ) as Province[];
  }

  updateFieldByIds(
    ids: EntityId[],
    _fieldCode: AdmLevelCode.PROVINCE,
    value: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    return this._updateFieldByIds(
      AdmLevelCode.PROVINCE,
      ids,
      "province",
      value,
      transactionContext,
    );
  }

  createMany(values: ProvinceRecord[]): DMLCreateManyResult {
    return this._createMany(AdmLevelCode.PROVINCE, values);
  }

  deleteDuplicates(): void {
    this._deleteDuplicates(AdmLevelCode.PROVINCE);
  }

  updateGeojsonByName(
    name: string,
    geojson: string,
    transactionContext?: DbTransactionContext,
  ): DMLUpdateResult {
    return this._updateGeojsonByIdentifiers(
      AdmLevelCode.PROVINCE,
      { province: name },
      geojson,
      transactionContext,
    );
  }
}

let _instance: ProvincesSqliteDML | null = null;

export function injectProvincesSqliteDML(
  config: MadaAdmConfigValues,
  db: SqliteDbConnection,
): ProvincesSqliteDML {
  if (!_instance) {
    _instance = new ProvincesSqliteDML(config, db);
  }
  return _instance;
}

export function resetProvincesSqliteDML(): void {
  _instance = null;
}
