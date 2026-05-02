import type { MadaAdmConfigDML } from "@scope/types/db";
import type { MaybePromise } from "@scope/types/utils";
import type { SqliteDbConnection } from "@scope/adapters/sqlite";
import { MADA_ADM_CONFIG_TABLE_NAME_SNAKE } from "@scope/consts/models";
import type {
  MadaAdmConfig,
  MadaAdmConfigSnakeCased,
  MadaAdmConfigValues,
} from "@scope/types/models";
import { mapMadaAdmConfigSnakeToCamel } from "@scope/helpers/models";

export class MadaAdmConfigSqliteDML implements MadaAdmConfigDML {
  #db: SqliteDbConnection;

  readonly #tableName = MADA_ADM_CONFIG_TABLE_NAME_SNAKE;

  constructor(db: SqliteDbConnection) {
    this.#db = db;
  }

  get(): MaybePromise<MadaAdmConfig | null> {
    const sql = `
			SELECT * FROM ${this.#tableName}
		`;
    const stmt = this.#db.client.prepare(sql);
    const res = stmt.get() as MadaAdmConfigSnakeCased | undefined;
    return res ? mapMadaAdmConfigSnakeToCamel(res) : null;
  }

  createOrUpdate(values: MadaAdmConfigValues): MaybePromise<MadaAdmConfig> {
    this.#db.transaction(() => {
      const sql = `
				SELECT * FROM ${this.#tableName} LIMIT 1
			`;
      const stmt = this.#db.client.prepare(sql);
      const res = stmt.get() as MadaAdmConfigSnakeCased | undefined;
      const existing = res ? mapMadaAdmConfigSnakeToCamel(res) : null;
      if (existing) {
        const sql = `
					UPDATE ${this.#tableName}
					SET tables_prefix = ?,
					SET is_fk_repeated = ?,
					SET is_province_repeated = ?,
					SET is_province_fk_repeated = ?,
					SET has_geojson = ?,
					SET has_adm_level = ?
					WHERE id = ?
				`;
        const stmt = this.#db.client.prepare(sql);
        stmt.run(
          values.tablesPrefix,
          Number(values.isFkRepeated),
          Number(values.isProvinceRepeated),
          Number(values.isProvinceFkRepeated),
          Number(values.hasGeojson),
          Number(values.hasAdmLevel),
          existing.id,
        );
      } else {
        const sql = `
					INSERT INTO ${this.#tableName}
					(tables_prefix, is_fk_repeated, is_province_repeated, is_province_fk_repeated, has_geojson, has_adm_level)
					VALUES (?, ?, ?, ?, ?, ?)
				`;
        const stmt = this.#db.client.prepare(sql);
        stmt.run(
          values.tablesPrefix,
          Number(values.isFkRepeated),
          Number(values.isProvinceRepeated),
          Number(values.isProvinceFkRepeated),
          Number(values.hasGeojson),
          Number(values.hasAdmLevel),
        );
      }
    });
    return this.get() as MadaAdmConfig;
  }
}

let madaAdmConfigSqliteDML: MadaAdmConfigSqliteDML | null = null;

export function injectMadaAdmConfigSqliteDML(db: SqliteDbConnection) {
  if (!madaAdmConfigSqliteDML) {
    madaAdmConfigSqliteDML = new MadaAdmConfigSqliteDML(db);
  }
  return madaAdmConfigSqliteDML;
}

export function resetMadaAdmConfigSqliteDML() {
  madaAdmConfigSqliteDML = null;
}
