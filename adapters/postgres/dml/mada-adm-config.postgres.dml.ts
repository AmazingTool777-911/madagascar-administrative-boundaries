import { MADA_ADM_CONFIG_TABLE_NAME_SNAKE } from "@scope/consts/models";
import type { MadaAdmConfigDML } from "@scope/types/db";
import type {
  MadaAdmConfig,
  MadaAdmConfigSnakeCased,
  MadaAdmConfigValues,
} from "@scope/types/models";
import type { PostgresDbConnection } from "../postgres-db.connection.ts";

/**
 * Concrete implementation of the MadaAdmConfigDML interface using PostgreSQL.
 */
export class MadaAdmConfigPostgresDML implements MadaAdmConfigDML {
  readonly schema: string;

  constructor(protected db: PostgresDbConnection, schema: string = "public") {
    this.schema = schema;
  }

  private _mapRowToConfig(row: MadaAdmConfigSnakeCased): MadaAdmConfig {
    return {
      id: row.id,
      createdAt: row.created_at?.toString(),
      updatedAt: row.updated_at?.toString(),
      tablesPrefix: row.tables_prefix,
      isFkRepeated: row.is_fk_repeated,
      isProvinceRepeated: row.is_province_repeated,
      isProvinceFkRepeated: row.is_province_fk_repeated,
      hasGeojson: row.has_geojson,
      hasAdmLevel: row.has_adm_level,
    };
  }

  /**
   * Retrieves the first MadaAdmConfig record from the database.
   */
  async get(): Promise<MadaAdmConfig | null> {
    const query =
      `SELECT * FROM ${this.schema}.${MADA_ADM_CONFIG_TABLE_NAME_SNAKE} LIMIT 1;`;
    const client = this.db.client;

    const result = await client.queryObject<MadaAdmConfigSnakeCased>(query);
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return this._mapRowToConfig(row);
  }

  /**
   * Inserts or updates the MadaAdmConfig record in the database.
   */
  async createOrUpdate(values: MadaAdmConfigValues): Promise<MadaAdmConfig> {
    return await this.db.transaction(async (transactionContext) => {
      const tx = transactionContext.tx;
      const checkQuery =
        `SELECT id FROM ${this.schema}.${MADA_ADM_CONFIG_TABLE_NAME_SNAKE} LIMIT 1;`;
      const checkResult = await tx.queryObject<{ id: number }>(checkQuery);
      const existingRow = checkResult.rows[0];

      if (existingRow) {
        const updateQuery = `
          UPDATE ${this.schema}.${MADA_ADM_CONFIG_TABLE_NAME_SNAKE}
          SET
            tables_prefix = $1,
            is_fk_repeated = $2,
            is_province_repeated = $3,
            is_province_fk_repeated = $4,
            has_geojson = $5,
            has_adm_level = $6,
            updated_at = NOW()
          WHERE id = $7
          RETURNING *;
        `;
        const result = await tx.queryObject<MadaAdmConfigSnakeCased>(
          updateQuery,
          [
            values.tablesPrefix,
            values.isFkRepeated,
            values.isProvinceRepeated,
            values.isProvinceFkRepeated,
            values.hasGeojson,
            values.hasAdmLevel,
            existingRow.id,
          ],
        );
        return this._mapRowToConfig(result.rows[0]);
      } else {
        const insertQuery = `
          INSERT INTO ${this.schema}.${MADA_ADM_CONFIG_TABLE_NAME_SNAKE} (
            tables_prefix,
            is_fk_repeated,
            is_province_repeated,
            is_province_fk_repeated,
            has_geojson,
            has_adm_level
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `;
        const result = await tx.queryObject<MadaAdmConfigSnakeCased>(
          insertQuery,
          [
            values.tablesPrefix,
            values.isFkRepeated,
            values.isProvinceRepeated,
            values.isProvinceFkRepeated,
            values.hasGeojson,
            values.hasAdmLevel,
          ],
        );
        return this._mapRowToConfig(result.rows[0]);
      }
    });
  }
}

let _instance: MadaAdmConfigPostgresDML | null = null;

/**
 * Injects (or creates) an instance of {@link MadaAdmConfigPostgresDML}.
 *
 * @param db - The PostgreSQL database connection instance.
 * @param schema - The ADM schema binding.
 * @returns The instance of the mada adm config DML.
 */
export function injectMadaAdmConfigPostgresDML(
  db: PostgresDbConnection,
  schema: string = "public",
): MadaAdmConfigPostgresDML {
  if (!_instance) _instance = new MadaAdmConfigPostgresDML(db, schema);
  return _instance;
}
