import { assertEquals } from "@std/assert";
import { prefixWithCamelCase, prefixWithSnakeCase } from "./string.utils.ts";

Deno.test("StringUtils - prefixWithSnakeCase", () => {
  assertEquals(
    prefixWithSnakeCase("MadaADM", "provinces"),
    "mada_adm_provinces",
  );
  assertEquals(prefixWithSnakeCase("mada_adm", "regions"), "mada_adm_regions");
  assertEquals(
    prefixWithSnakeCase("mada adm ", "communes"),
    "mada_adm_communes",
  );
  assertEquals(
    prefixWithSnakeCase("madaAdm", "fokontanys"),
    "mada_adm_fokontanys",
  );
  assertEquals(prefixWithSnakeCase("", "provinces"), "provinces");
  assertEquals(prefixWithSnakeCase(null, "regions"), "regions");
  assertEquals(prefixWithSnakeCase(undefined, "districts"), "districts");
});

Deno.test("StringUtils - prefixWithCamelCase", () => {
  assertEquals(prefixWithCamelCase("MadaADM", "provinces"), "madaAdmProvinces");
  assertEquals(prefixWithCamelCase("mada_adm", "regions"), "madaAdmRegions");
  assertEquals(prefixWithCamelCase("mada adm ", "communes"), "madaAdmCommunes");
  assertEquals(
    prefixWithCamelCase("madaAdm", "fokontanys"),
    "madaAdmFokontanys",
  );
  assertEquals(prefixWithCamelCase("", "provinces"), "provinces");
  assertEquals(prefixWithCamelCase(null, "regions"), "regions");
  assertEquals(prefixWithCamelCase(undefined, "districts"), "districts");
});
