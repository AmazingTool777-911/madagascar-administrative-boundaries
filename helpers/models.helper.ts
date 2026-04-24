import type {
  AdmRecord,
  AdmValues,
  Commune,
  CommuneRecord,
  CommuneSnakeCased,
  CommuneValues,
  District,
  DistrictRecord,
  DistrictSnakeCased,
  DistrictValues,
  Fokontany,
  FokontanyRecord,
  FokontanySnakeCased,
  FokontanyValues,
  MadaAdmConfig,
  MadaAdmConfigSnakeCased,
  Province,
  ProvinceRecord,
  ProvinceSnakedCased,
  ProvinceValues,
  Region,
  RegionRecord,
  RegionSnakeCased,
  RegionValues,
} from "@scope/types/models";
import type { GeoJSONGeometry } from "@scope/types/utils";

/**
 * Parses any unformatted timestamp payload into its deterministic ISO standard format.
 *
 * @param timestamp - The incoming date data (often natively passed from databases).
 * @returns The converted ISO standard date string, or undefined if no timestamp was mapped.
 */
function parseTimestamp(
  timestamp?: Date | string | number,
): string | undefined {
  if (timestamp === undefined || timestamp === null) return undefined;
  return new Date(timestamp).toISOString();
}

/**
 * Ensures geojson values from the database are natively cast safely into objects.
 */
function parseGeojson(
  geojson?: string | GeoJSONGeometry,
): GeoJSONGeometry | undefined {
  if (!geojson) return undefined;
  if (typeof geojson === "string") {
    try {
      return JSON.parse(geojson) as GeoJSONGeometry;
    } catch {
      return undefined;
    }
  }
  return geojson;
}

/**
 * Maps a snake cased Mada ADM Config model into its Camel Cased entity.
 *
 * @param entity - The raw snake cased database row config record.
 * @returns The structured camel cased configuration framework entity.
 */
export function mapMadaAdmConfigSnakeToCamel(
  entity: MadaAdmConfigSnakeCased,
): MadaAdmConfig {
  return {
    id: entity.id,
    tablesPrefix: entity.tables_prefix,
    isFkRepeated: entity.is_fk_repeated,
    isProvinceRepeated: entity.is_province_repeated,
    isProvinceFkRepeated: entity.is_province_fk_repeated,
    hasGeojson: entity.has_geojson,
    hasAdmLevel: entity.has_adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased Province model into its Camel Cased entity.
 */
export function mapProvinceSnakeToCamel(entity: ProvinceSnakedCased): Province {
  return {
    id: entity.id,
    province: entity.province,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased Region model into its Camel Cased entity.
 */
export function mapRegionSnakeToCamel(entity: RegionSnakeCased): Region {
  return {
    id: entity.id,
    region: entity.region,
    province: entity.province,
    provinceId: entity.province_id,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased District model into its Camel Cased entity.
 */
export function mapDistrictSnakeToCamel(entity: DistrictSnakeCased): District {
  return {
    id: entity.id,
    district: entity.district,
    region: entity.region,
    province: entity.province,
    regionId: entity.region_id,
    provinceId: entity.province_id,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased Commune model into its Camel Cased entity.
 */
export function mapCommuneSnakeToCamel(entity: CommuneSnakeCased): Commune {
  return {
    id: entity.id,
    commune: entity.commune,
    district: entity.district,
    region: entity.region,
    province: entity.province,
    districtId: entity.district_id,
    regionId: entity.region_id,
    provinceId: entity.province_id,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a snake cased Fokontany model into its Camel Cased entity.
 */
export function mapFokontanySnakeToCamel(
  entity: FokontanySnakeCased,
): Fokontany {
  return {
    id: entity.id,
    fokontany: entity.fokontany,
    commune: entity.commune,
    district: entity.district,
    region: entity.region,
    province: entity.province,
    communeId: entity.commune_id,
    districtId: entity.district_id,
    regionId: entity.region_id,
    provinceId: entity.province_id,
    geojson: parseGeojson(entity.geojson),
    admLevel: entity.adm_level,
    createdAt: parseTimestamp(entity.created_at),
    updatedAt: parseTimestamp(entity.updated_at),
  };
}

/**
 * Maps a Province record to its pure values (stripping any DB-specific IDs).
 */
export function mapProvinceRecordToValues(
  record: ProvinceRecord,
): ProvinceValues {
  return {
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Maps a Region record to its pure values (stripping any DB-specific IDs).
 */
export function mapRegionRecordToValues(record: RegionRecord): RegionValues {
  return {
    region: record.region,
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Maps a District record to its pure values (stripping any DB-specific IDs).
 */
export function mapDistrictRecordToValues(
  record: DistrictRecord,
): DistrictValues {
  return {
    district: record.district,
    region: record.region,
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Maps a Commune record to its pure values (stripping any DB-specific IDs).
 */
export function mapCommuneRecordToValues(record: CommuneRecord): CommuneValues {
  return {
    commune: record.commune,
    district: record.district,
    region: record.region,
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Maps a Fokontany record to its pure values (stripping any DB-specific IDs).
 */
export function mapFokontanyRecordToValues(
  record: FokontanyRecord,
): FokontanyValues {
  return {
    fokontany: record.fokontany,
    commune: record.commune,
    district: record.district,
    region: record.region,
    province: record.province,
    admLevel: record.admLevel,
    geojson: record.geojson,
  };
}

/**
 * Polymorphic mapper that converts any ADM record into its corresponding values.
 */
export function mapAdmRecordToValues(record: AdmRecord): AdmValues {
  if (isFokontanyValues(record)) {
    return mapFokontanyRecordToValues(record as FokontanyRecord);
  } else if (isCommuneValues(record)) {
    return mapCommuneRecordToValues(record as CommuneRecord);
  } else if (isDistrictValues(record)) {
    return mapDistrictRecordToValues(record as DistrictRecord);
  } else if (isRegionValues(record)) {
    return mapRegionRecordToValues(record as RegionRecord);
  } else {
    return mapProvinceRecordToValues(record as ProvinceRecord);
  }
}

export function isProvinceValues(
  values: AdmValues | AdmRecord,
): values is ProvinceValues {
  if (typeof values.admLevel === "number") return values.admLevel === 0;
  return (
    "province" in values &&
    Object.keys(values).every((key) => {
      return !["region", "district", "commune", "fokontany"].includes(key);
    })
  );
}

export function isRegionValues(
  values: AdmValues | AdmRecord,
): values is RegionValues {
  if (typeof values.admLevel === "number") return values.admLevel === 1;
  return (
    "region" in values &&
    Object.keys(values).every((key) => {
      return !["district", "commune", "fokontany"].includes(key);
    })
  );
}

export function isDistrictValues(
  values: AdmValues | AdmRecord,
): values is DistrictValues {
  if (typeof values.admLevel === "number") return values.admLevel === 2;
  return (
    "district" in values &&
    Object.keys(values).every((key) => {
      return !["commune", "fokontany"].includes(key);
    })
  );
}

export function isCommuneValues(
  values: AdmValues | AdmRecord,
): values is CommuneValues {
  if (typeof values.admLevel === "number") return values.admLevel === 3;
  return (
    "commune" in values &&
    Object.keys(values).every((key) => {
      return !["fokontany"].includes(key);
    })
  );
}

export function isFokontanyValues(
  values: AdmValues | AdmRecord,
): values is FokontanyValues {
  if (typeof values.admLevel === "number") return values.admLevel === 4;
  return "fokontany" in values;
}

export function getAdmValuesEncodedString(
  values: AdmValues | AdmRecord,
): string {
  if (isProvinceValues(values)) return (values as ProvinceRecord).province;
  else if (isRegionValues(values)) return (values as RegionRecord).region;

  // For higher levels, we use parent names to create a unique ID
  let encodedString = (values as RegionRecord).region;
  if (isDistrictValues(values)) {
    encodedString += `_${(values as DistrictRecord).district}`;
  } else if (isCommuneValues(values)) {
    encodedString += `_${(values as CommuneRecord).district}_${
      (values as CommuneRecord).commune
    }`;
  } else if (isFokontanyValues(values)) {
    encodedString += `_${(values as FokontanyRecord).district}_${
      (values as FokontanyRecord).commune
    }_${(values as FokontanyRecord).fokontany}`;
  }
  return encodedString;
}
