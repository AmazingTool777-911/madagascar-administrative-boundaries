import { getParentRegionOfDistricts } from "./get-parent-adm-by-area.query.ts";
import { Client } from "@db/postgres";
import type { MadaAdmConfigValues } from "@scope/types/models";
import { assertEquals } from "@std/assert";

/**
 * Mocking the PostgreSQL client to inspect the query and arguments.
 */
class MockClient {
  lastQuery: string = "";
  lastArgs: any[] = [];

  queryObject(query: string, args: any[]) {
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

  const inputs: any = [
    ["District A", { type: "Polygon", coordinates: [] }],
  ];

  await getParentRegionOfDistricts(inputs, config, mockClient as any);

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
  assertEquals(hasGeojsonColumn, true, "Spatial column should be named 'geojson'");
});
