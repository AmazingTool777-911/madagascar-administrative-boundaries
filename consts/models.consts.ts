/**
 * The administrative level codes used in the Madagascar ADM hierarchy.
 */
export enum AdmLevelCode {
  /** Top-level administrative division. */
  PROVINCE = "ADM0",
  /** Second-level administrative division. */
  REGION = "ADM1",
  /** Third-level administrative division. */
  DISTRICT = "ADM2",
  /** Fourth-level administrative division. */
  COMMUNE = "ADM3",
  /** Fifth-level administrative division. */
  FOKONTANY = "ADM4",
}

/**
 * A mapping of administrative level codes to their human-readable titles.
 */
export const ADM_LEVEL_TITLE_BY_CODE: Map<AdmLevelCode, string> = new Map([
  [AdmLevelCode.PROVINCE, "province"],
  [AdmLevelCode.REGION, "region"],
  [AdmLevelCode.DISTRICT, "district"],
  [AdmLevelCode.COMMUNE, "commune"],
  [AdmLevelCode.FOKONTANY, "fokontany"],
]);

/**
 * A mapping of human-readable administrative level titles to their corresponding codes.
 */
export const ADM_LEVEL_CODE_BY_TITLE: Map<string, AdmLevelCode> = new Map([
  ["province", AdmLevelCode.PROVINCE],
  ["region", AdmLevelCode.REGION],
  ["district", AdmLevelCode.DISTRICT],
  ["commune", AdmLevelCode.COMMUNE],
  ["fokontany", AdmLevelCode.FOKONTANY],
]);

/**
 * The ordered list of administrative level codes, from province to fokontany.
 */
export const ADM_LEVEL_CODES_INDEXED: AdmLevelCode[] = [
  AdmLevelCode.PROVINCE,
  AdmLevelCode.REGION,
  AdmLevelCode.DISTRICT,
  AdmLevelCode.COMMUNE,
  AdmLevelCode.FOKONTANY,
];

/**
 * A mapping of administrative level codes to their index in the hierarchy.
 */
export const ADM_LEVEL_INDEX_BY_CODE: Map<AdmLevelCode, number> = new Map([
  [AdmLevelCode.PROVINCE, 0],
  [AdmLevelCode.REGION, 1],
  [AdmLevelCode.DISTRICT, 2],
  [AdmLevelCode.COMMUNE, 3],
  [AdmLevelCode.FOKONTANY, 4],
]);

/**
 * A mapping of administrative level codes to their corresponding GeoJSON file names.
 */
export const ADM_GEOJSON_FILENAME_BY_LEVEL: Map<AdmLevelCode, string> = new Map(
  [
    [AdmLevelCode.PROVINCE, "geoBoundaries-MDG-ADM0-custom.geojson"],
    [AdmLevelCode.REGION, "geoBoundaries-MDG-ADM1-custom.geojson"],
    [AdmLevelCode.DISTRICT, "geoBoundaries-MDG-ADM2.geojson"],
    [AdmLevelCode.COMMUNE, "geoBoundaries-MDG-ADM3.geojson"],
    [AdmLevelCode.FOKONTANY, "geoBoundaries-MDG-ADM4.geojson"],
  ],
);
