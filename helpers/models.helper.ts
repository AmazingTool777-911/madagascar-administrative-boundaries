import type {
  AdmProperties,
  Commune,
  CommuneSnakeCased,
  District,
  DistrictSnakeCased,
  Fokontany,
  FokontanySnakeCased,
  MadaAdmConfig,
  MadaAdmConfigSnakeCased,
  Province,
  ProvinceSnakedCased,
  Region,
  RegionSnakeCased,
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
  geojson?: string | GeoJSONGeometry<AdmProperties>,
): GeoJSONGeometry<AdmProperties> | undefined {
  if (!geojson) return undefined;
  if (typeof geojson === "string") {
    try {
      return JSON.parse(geojson) as GeoJSONGeometry<AdmProperties>;
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
export function mapProvinceSnakeToCamel(
  entity: ProvinceSnakedCased,
): Province {
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
export function mapRegionSnakeToCamel(
  entity: RegionSnakeCased,
): Region {
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
export function mapDistrictSnakeToCamel(
  entity: DistrictSnakeCased,
): District {
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
export function mapCommuneSnakeToCamel(
  entity: CommuneSnakeCased,
): Commune {
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
