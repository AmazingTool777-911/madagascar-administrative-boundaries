import type { AdmLevelCode } from "@scope/consts/models";
import type { GeoJSONGeometry } from "@scope/types/utils";

export type Nullable<T> = T | null;

export type EntityId = number | string;

export type EntitySnakeCased<T> = {
  id: number;
  created_at?: Date | string | number;
  updated_at?: Date | string | number;
} & T;
export type Entity<T> = {
  id: EntityId;
  createdAt?: string;
  updatedAt?: string;
} & T;

/**
 * Configuration values defining the conventions, structure, and relationships of the ADM tables.
 */
export type MadaAdmConfigValues = {
  /** The prefix used for all ADM table names. */
  tablesPrefix: Nullable<string>;
  /** Indicates whether foreign key columns are repeated across subsequent child tables. */
  isFkRepeated: boolean;
  /** Indicates whether the province name column is repeated across sub-administrative tables. */
  isProvinceRepeated: boolean;
  /** Indicates whether the province foreign key is repeated across sub-administrative tables. */
  isProvinceFkRepeated: boolean;
  /** Indicates whether the tables include spatial GeoJSON geometries. */
  hasGeojson: boolean;
  /** Indicates whether the tables include an admLevel column natively. */
  hasAdmLevel: boolean;
};

/**
 * Snake-cased version of MadaAdmConfigValues, representing the exact database row structure.
 */
export type MadaAdmConfigSnakeCased = EntitySnakeCased<{
  tables_prefix: Nullable<string>;
  is_fk_repeated: boolean;
  is_province_repeated: boolean;
  is_province_fk_repeated: boolean;
  has_geojson: boolean;
  has_adm_level: boolean;
}>;

/**
 * The standard application entity wrapper for MadaAdmConfig.
 */
export type MadaAdmConfig = Entity<MadaAdmConfigValues>;

export type AdmProperties = {
  shapeName: string;
  shapeLevel: AdmLevelCode;
};

export type HasGeoJsonLowLevel<T> = T & {
  geojson?: GeoJSONGeometry<AdmProperties> | string;
};
export type HasGeoJson<T> = T & {
  geojson?: GeoJSONGeometry<AdmProperties>;
};

export type HasAdmLevelLowLevel<T> = T & {
  adm_level?: number;
};
export type HasAdmLevel<T> = T & {
  admLevel?: number;
};

export type ProvinceValues = HasAdmLevel<
  HasGeoJson<{
    province: string;
  }>
>;
export type ProvinceSnakedCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<{
      province: string;
    }>
  >
>;
export type Province = Entity<ProvinceValues>;

export type RegionValues = HasAdmLevel<
  HasGeoJson<{
    region: string;
    province: string;
    provinceId: EntityId;
  }>
>;
export type RegionSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<{
      region: string;
      province: string;
      province_id: EntityId;
    }>
  >
>;
export type Region = Entity<RegionValues>;

export type DistrictValues = HasAdmLevel<
  HasGeoJson<{
    district: string;
    region: string;
    province?: string;
    regionId: EntityId;
    provinceId?: EntityId;
  }>
>;
export type DistrictSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<{
      district: string;
      region: string;
      province?: string;
      region_id: EntityId;
      province_id?: EntityId;
    }>
  >
>;
export type District = Entity<DistrictValues>;

export type CommuneValues = HasAdmLevel<
  HasGeoJson<{
    commune: string;
    district: string;
    region: string;
    province?: string;
    districtId: EntityId;
    regionId?: EntityId;
    provinceId?: EntityId;
  }>
>;
export type CommuneSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<{
      commune: string;
      district: string;
      region: string;
      province?: string;
      district_id: EntityId;
      region_id?: EntityId;
      province_id?: EntityId;
    }>
  >
>;
export type Commune = Entity<CommuneValues>;

export type FokontanyValues = HasAdmLevel<
  HasGeoJson<{
    fokontany: string;
    commune: string;
    district: string;
    region: string;
    province?: string;
    communeId: EntityId;
    districtId?: EntityId;
    regionId?: EntityId;
    provinceId?: EntityId;
  }>
>;
export type FokontanySnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<{
      fokontany: string;
      commune: string;
      district: string;
      region: string;
      province?: string;
      commune_id: EntityId;
      district_id?: EntityId;
      region_id?: EntityId;
      province_id?: EntityId;
    }>
  >
>;
export type Fokontany = Entity<FokontanyValues>;
