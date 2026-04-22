import { getParentRegionsOfDistricts } from "./get-parent-adm-by-area.query.ts";
import type { AdmProperties, MadaAdmConfigValues } from "@scope/types/models";
import { assertEquals } from "@std/assert";
import type { GeoJSONFeature } from "@scope/types/utils";

/**
 * Mocking the PostgreSQL client to inspect the query and arguments.
 */
class MockClient {
  lastQuery = "";
  lastArgs: unknown[] = [];

  queryObject(query: string, args: unknown[]) {
    this.lastQuery = query;
    this.lastArgs = args;
    return Promise.resolve({ rows: [] });
  }
}

Deno.test("getParentRegionOfDistricts - SQL generation", async () => {
  const mockClient = new MockClient();
  const config: MadaAdmConfigValues = {
    tablesPrefix: "ext",
    isFkRepeated: false,
    isProvinceRepeated: true,
    isProvinceFkRepeated: false,
    hasGeojson: true,
    hasAdmLevel: false,
  };

  const inputs: [string, GeoJSONFeature<AdmProperties>][] = [[
    "District A",
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: {} as AdmProperties,
    },
  ]];

  await getParentRegionsOfDistricts(
    inputs,
    config,
    mockClient as unknown as Parameters<typeof getParentRegionsOfDistricts>[2],
  );

  // Check if the table name is correctly prefixed
  const hasPrefixedTable = mockClient.lastQuery.includes("ext_regions");
  assertEquals(hasPrefixedTable, true, "Table name should be prefixed");

  // Check if columns are selected from 'best'
  const hasBestColumns = mockClient.lastQuery.includes("best.region") &&
    mockClient.lastQuery.includes("best.province") &&
    mockClient.lastQuery.includes("best.province_id");
  assertEquals(hasBestColumns, true, "Columns should be selected from 'best'");

  // Check if geometry column is used
  const hasGeojsonColumn = mockClient.lastQuery.includes("t.geojson");
  assertEquals(
    hasGeojsonColumn,
    true,
    "Spatial column should be named 'geojson'",
  );
});
