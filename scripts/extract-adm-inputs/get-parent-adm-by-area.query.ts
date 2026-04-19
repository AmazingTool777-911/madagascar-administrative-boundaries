import { Client } from "@db/postgres";
import { StringUtils } from "@scope/utils";
import type { DbTransactionContext } from "@scope/types/db";
import {
  type AdmProperties,
  type CommuneValues,
  type DistrictValues,
  type MadaAdmConfigValues,
  type RegionValues,
} from "@scope/types/models";
import type { GeoJSONGeometry } from "@scope/types/utils";

/**
 * Represents an input ADM record for parent matching.
 */
export type InputRecord = [
  name: string,
  geojson: GeoJSONGeometry<AdmProperties>,
];

/**
 * Result of a parent matching query.
 */
interface ParentMatchRow {
  input_id: string;
  matched_id: number;
  [key: string]: unknown;
}

/**
 * High-level helper to execute the spatial intersection area query for batch ADM inputs.
 *
 * @param inputs - List of current ADM names and their GeoJSON features.
 * @param config - The Madagascar ADM configuration.
 * @param parentTableBaseName - The base name of the parent table (e.g. 'regions').
 * @param selectColumns - The columns to select from the parent table.
 * @param db - The database client or transaction context.
 * @returns A mapping of input ADM names to their matched parent records.
 */
async function buildParentByAreaQuery<T>(
  inputs: InputRecord[],
  config: MadaAdmConfigValues,
  parentTableBaseName: string,
  selectColumns: string[],
  db: Client | DbTransactionContext,
): Promise<[string, T][]> {
  const client = "tx" in db ? db.tx : db;
  const parentTable = StringUtils.prefixWithSnakeCase(
    config.tablesPrefix,
    parentTableBaseName,
  );

  // Map inputs to JSONB format expected by the query
  const inputJsonb = inputs.map(([name, geojson]) =>
    JSON.stringify({
      id: name,
      geojson: JSON.stringify(geojson),
    })
  );

  const selectClause = selectColumns.map((c) => `t.${c}`).join(", ");

  const query = `
    SELECT
        i.id        AS input_id,
        best.id     AS matched_id,
        ${selectColumns.map((c) => `best.${c}`).join(", ")}
    FROM (
        SELECT
            (rec->>'id')                        AS id,
            ST_GeomFromGeoJSON(rec->>'geojson') AS geom
        FROM UNNEST($1::jsonb[]) AS rec
    ) AS i
    CROSS JOIN LATERAL (
        SELECT
            t.id,
            ${selectClause},
            ST_Area(
                ST_Intersection(
                    ST_Transform(t.geojson, 32738),
                    ST_Transform(i.geom, 32738)
                )
            )                                   AS intersection_area
        FROM ${parentTable} t
        WHERE ST_Intersects(t.geojson, i.geom)
        ORDER BY intersection_area DESC
        LIMIT 1
    ) AS best
  `;

  const result = await client.queryObject<ParentMatchRow & T>(query, [
    inputJsonb,
  ]);

  return result.rows.map((row) => {
    const { input_id, matched_id: _matched_id, ...rest } = row as ParentMatchRow &
      T;
    return [input_id, rest as T];
  });
}

/**
 * Gets the parent Region for a list of Districts based on spatial intersection.
 */
export async function getParentRegionOfDistricts(
  inputs: InputRecord[],
  config: MadaAdmConfigValues,
  db: Client | DbTransactionContext,
): Promise<[string, RegionValues][]> {
  return await buildParentByAreaQuery<RegionValues>(
    inputs,
    config,
    "regions",
    ["region", "province", "province_id"],
    db,
  );
}

/**
 * Gets the parent District for a list of Communes based on spatial intersection.
 */
export async function getParentDistrictOfCommunes(
  inputs: InputRecord[],
  config: MadaAdmConfigValues,
  db: Client | DbTransactionContext,
): Promise<[string, DistrictValues][]> {
  // DistrictValues also contains optional region/province fields
  return await buildParentByAreaQuery<DistrictValues>(
    inputs,
    config,
    "districts",
    ["district", "region", "province", "region_id", "province_id"],
    db,
  );
}

/**
 * Gets the parent Commune for a list of Fokontanys based on spatial intersection.
 */
export async function getParentCommuneOfFokontanys(
  inputs: InputRecord[],
  config: MadaAdmConfigValues,
  db: Client | DbTransactionContext,
): Promise<[string, CommuneValues][]> {
  return await buildParentByAreaQuery<CommuneValues>(
    inputs,
    config,
    "communes",
    [
      "commune",
      "district",
      "region",
      "province",
      "district_id",
      "region_id",
      "province_id",
    ],
    db,
  );
}
