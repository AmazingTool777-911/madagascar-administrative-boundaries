import { InMemory, Redis } from "@scope/lib/workers-mediators";
import { injectPostgresDbConnection } from "@scope/adapters/postgres";
import { DbType } from "@scope/consts/db";
import type { ExtractAdmInputJobContext } from "../extract-adm-input.d.ts";
import type { GeoJSONFeature } from "@scope/types/utils";
import {
  ADM_LEVEL_TITLE_BY_CODE,
  AdmLevelCode,
  PROVINCE_BY_REGION_MAP,
} from "@scope/consts/models";
import {
  getParentCommunesOfFokontanys,
  getParentDistrictsOfCommunes,
  getParentRegionsOfDistricts,
  type InputRecord,
} from "../get-parent-adm-by-area.query.ts";
import {
  type AdmProperties,
  type AdmRecords,
  type CommuneRecord,
  type DistrictRecord,
  type FokontanyRecord,
  type ProvinceRecord,
  type RegionRecord,
} from "@scope/types/models";
import {
  injectProvincesPostgresDML,
  ProvincesPostgresDML,
} from "@scope/adapters/postgres";

const pg = injectPostgresDbConnection();

let provincesDML!: ProvincesPostgresDML;

type Feature = GeoJSONFeature<AdmProperties>;

const executorType =
  new URL(self.location.href).searchParams.get("disable-redis") === "true"
    ? "in-memory"
    : "redis";

const executor = executorType === "redis"
  ? Redis.injectRedisQueueWorkerExecutor<
    ExtractAdmInputJobContext,
    Feature,
    AdmRecords
  >()
  : InMemory.injectInMemoryQueueWorkerExecutor<
    ExtractAdmInputJobContext,
    Feature,
    AdmRecords
  >();

executor.run({
  async init(context, { workerMetadata }) {
    console.log(
      `   [Processing Worker #${workerMetadata.index}] init — level: ${context.currentAdmLevel}`,
    );
    if (context.pgConnection) {
      await pg.connect({
        dbType: DbType.Postgres,
        connection: context.pgConnection,
      });
      provincesDML = injectProvincesPostgresDML(context.config, pg, context.pgSchema);
    }
  },
  async execute(_context, batch, { workerMetadata, retryCount }) {
    const retryLog = retryCount > 0 ? ` (retry #${retryCount})` : "";
    batch.forEach((feature) => {
      const levelTitle =
        ADM_LEVEL_TITLE_BY_CODE.get(feature.properties.shapeType) ??
          feature.properties.shapeType;
      console.log(
        `%c   [Processing Worker #${workerMetadata.index}] processing ${levelTitle}: ${feature.properties.shapeName}${retryLog}`,
        "color: green",
      );
    });
    if (_context.currentAdmLevel === AdmLevelCode.PROVINCE) {
      return batch.map<ProvinceRecord>((feature) => ({
        province: feature.properties.shapeName,
        geojson: feature.geometry,
      }));
    } else if (_context.currentAdmLevel === AdmLevelCode.REGION) {
      const provinces = await provincesDML.getManyByNames(
        batch.map((feature) => {
          const province = PROVINCE_BY_REGION_MAP.get(
            feature.properties.shapeName,
          );
          if (!province) {
            throw new Error(
              `   Province not found for region: ${feature.properties.shapeName}`,
            );
          }
          return province;
        }),
      );
      const provinceByName = new Map(provinces.map((p) => [p.province, p]));
      return batch.map<RegionRecord>((feature) => {
        const provinceName = PROVINCE_BY_REGION_MAP.get(
          feature.properties.shapeName,
        ) as string;
        const province = provinceByName.get(provinceName);
        if (!province) {
          throw new Error(`Province not found for name: ${provinceName}`);
        }
        return {
          region: feature.properties.shapeName,
          province: provinceName,
          provinceId: province.id,
          geojson: feature.geometry,
        };
      });
    }
    const inputs: InputRecord[] = batch.map((feature) => [
      getFeatureEncodedString(
        feature.properties.shapeName,
        feature.properties.shapeID,
      ),
      feature,
    ]);
    const geojsonByName = new Map<string, Feature>(inputs);
    switch (_context.currentAdmLevel) {
      case AdmLevelCode.DISTRICT: {
        const parentRegionsByDistrictResult = await getParentRegionsOfDistricts(
          inputs,
          _context.config,
          pg.client,
        );
        return parentRegionsByDistrictResult.map<DistrictRecord>(
          ([districtEncoded, region]) => {
            const { shapeName: districtName } = destructFeatureEncodedString(
              districtEncoded,
            );
            return {
              district: districtName,
              region: region.region,
              province: region.province,
              regionId: region.id,
              provinceId: region.provinceId,
              geojson: geojsonByName.get(districtEncoded)?.geometry,
            };
          },
        );
      }
      case AdmLevelCode.COMMUNE: {
        const parentDistrictsByCommuneResult =
          await getParentDistrictsOfCommunes(
            inputs,
            _context.config,
            pg.client,
          );
        return parentDistrictsByCommuneResult.map<CommuneRecord>(
          ([communeEncoded, district]) => {
            const { shapeName: communeName } = destructFeatureEncodedString(
              communeEncoded,
            );
            return {
              commune: communeName,
              district: district.district,
              region: district.region,
              province: district.province,
              districtId: district.id,
              regionId: district.regionId,
              provinceId: district.provinceId,
              geojson: geojsonByName.get(communeEncoded)?.geometry,
            };
          },
        );
      }
      case AdmLevelCode.FOKONTANY: {
        const parentCommunesByFokontanyResult =
          await getParentCommunesOfFokontanys(
            inputs,
            _context.config,
            pg.client,
          );
        return parentCommunesByFokontanyResult.map<FokontanyRecord>(
          ([fokontanyEncoded, commune]) => {
            const { shapeName: fokontanyName } = destructFeatureEncodedString(
              fokontanyEncoded,
            );
            return {
              fokontany: fokontanyName,
              commune: commune.commune,
              district: commune.district,
              region: commune.region,
              province: commune.province,
              communeId: commune.id,
              districtId: commune.districtId,
              regionId: commune.regionId,
              provinceId: commune.provinceId,
              geojson: geojsonByName.get(fokontanyEncoded)?.geometry,
            };
          },
        );
      }
      default:
        throw new Error(`Unsupported ADM level: ${_context.currentAdmLevel}`);
    }
  },
  async teardown(_context, { workerMetadata }) {
    console.log(`   [Processing Worker #${workerMetadata.index}] teardown`);
    await pg.close();
  },
});

const FEATURE_ENCODER_SEPARATOR = "---";

function getFeatureEncodedString(shapeName: string, shapeID: string) {
  return `${shapeName}${FEATURE_ENCODER_SEPARATOR}${shapeID}`;
}

function destructFeatureEncodedString(encodedString: string) {
  const [shapeName, shapeID] = encodedString.split(FEATURE_ENCODER_SEPARATOR);
  return { shapeName, shapeID };
}
