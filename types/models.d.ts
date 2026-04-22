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
  shapeType: AdmLevelCode;
  shapeID: string;
};

export type HasGeoJsonLowLevel<T> = T & {
  geojson?: GeoJSONGeometry | string;
};
export type HasGeoJson<T> = T & {
  geojson?: GeoJSONGeometry;
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
export type ProvinceRecord = ProvinceValues;
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
  }>
>;
export type RegionFks = { provinceId: EntityId };
export type RegionFksSnakeCased = { province_id: EntityId };
export type RegionRecord = RegionValues & RegionFks;
export type RegionSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<
      {
        region: string;
        province: string;
      } & RegionFksSnakeCased
    >
  >
>;
export type Region = Entity<RegionRecord>;

export type DistrictValues = HasAdmLevel<
  HasGeoJson<{
    district: string;
    region: string;
    province?: string;
  }>
>;
export type DistrictFks = { regionId: EntityId; provinceId?: EntityId };
export type DistrictFksSnakeCased = {
  region_id: EntityId;
  province_id?: EntityId;
};
export type DistrictRecord = DistrictValues & DistrictFks;
export type DistrictSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<
      {
        district: string;
        region: string;
        province?: string;
      } & DistrictFksSnakeCased
    >
  >
>;
export type District = Entity<DistrictRecord>;

export type CommuneValues = HasAdmLevel<
  HasGeoJson<{
    commune: string;
    district: string;
    region: string;
    province?: string;
  }>
>;
export type CommuneFks = {
  districtId: EntityId;
  regionId?: EntityId;
  provinceId?: EntityId;
};
export type CommuneFksSnakeCased = {
  district_id: EntityId;
  region_id?: EntityId;
  province_id?: EntityId;
};
export type CommuneRecord = CommuneValues & CommuneFks;
export type CommuneSnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<
      {
        commune: string;
        district: string;
        region: string;
        province?: string;
      } & CommuneFksSnakeCased
    >
  >
>;
export type Commune = Entity<CommuneRecord>;

export type FokontanyValues = HasAdmLevel<
  HasGeoJson<{
    fokontany: string;
    commune: string;
    district: string;
    region: string;
    province?: string;
  }>
>;
export type FokontanyFks = {
  communeId: EntityId;
  districtId?: EntityId;
  regionId?: EntityId;
  provinceId?: EntityId;
};
export type FokontanyFksSnakeCased = {
  commune_id: EntityId;
  district_id?: EntityId;
  region_id?: EntityId;
  province_id?: EntityId;
};
export type FokontanyRecord = FokontanyValues & FokontanyFks;
export type FokontanySnakeCased = EntitySnakeCased<
  HasAdmLevelLowLevel<
    HasGeoJsonLowLevel<
      {
        fokontany: string;
        commune: string;
        district: string;
        region: string;
        province?: string;
      } & FokontanyFksSnakeCased
    >
  >
>;
export type Fokontany = Entity<FokontanyRecord>;

export type AdmValues =
  | ProvinceValues
  | RegionValues
  | DistrictValues
  | CommuneValues
  | FokontanyValues;

export type AdmRecords =
  | ProvinceRecord
  | RegionRecord
  | DistrictRecord
  | CommuneRecord
  | FokontanyRecord;

export type AdmValuesDiscriminated =
  | {
    admLevelCode: AdmLevelCode.PROVINCE;
    values: ProvinceRecord;
  }
  | {
    admLevelCode: AdmLevelCode.REGION;
    values: RegionRecord;
  }
  | {
    admLevelCode: AdmLevelCode.DISTRICT;
    values: DistrictRecord;
  }
  | {
    admLevelCode: AdmLevelCode.COMMUNE;
    values: CommuneRecord;
  }
  | {
    admLevelCode: AdmLevelCode.FOKONTANY;
    values: FokontanyRecord;
  };
