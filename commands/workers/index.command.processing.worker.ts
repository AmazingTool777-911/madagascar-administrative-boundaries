import { injectDbConnection, injectProvincesDML } from "@scope/db";
import { injectRedisQueueWorkerExecutor } from "@scope/lib/redis-workers-mediators";
import { injectInMemoryQueueWorkerExecutor } from "@scope/lib/in-memory-workers-mediators";
import type {
  CommuneTableDML,
  DbConnection,
  DistrictTableDML,
  ProvinceTableDML,
  RegionTableDML,
} from "@scope/types/db";
import type { SeedAdmJobContext } from "@scope/types/command";
import type {
  AdmRecord,
  AdmValues,
  CommuneAttributes,
  CommuneRecord,
  CommuneValues,
  DistrictAttributes,
  DistrictRecord,
  FokontanyRecord,
  FokontanyValues,
  ProvinceRecord,
  RegionRecord,
} from "@scope/types/models";
import { colors } from "@cliffy/ansi/colors";
import {
  injectCommunesDML,
  injectDistrictsDML,
  injectRegionsDML,
} from "@scope/db/dml";
import { QueueWorkerExecutor } from "@scope/lib/workers-mediators";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import {
  encodeCommuneAttributes,
  encodeDistrictAttributes,
  isCommuneValues,
  isDistrictValues,
  isFokontanyValues,
  isProvinceValues,
  isRegionValues,
} from "@scope/helpers/models";

let db!: DbConnection;

let provincesDML!: ProvinceTableDML;
let regionsDML!: RegionTableDML;
let districtsDML!: DistrictTableDML;
let communesDML!: CommuneTableDML;

const executorType =
  new URL(self.location.href).searchParams.get("disable-redis") === "true"
    ? "in-memory"
    : "redis";

const executor: QueueWorkerExecutor<SeedAdmJobContext, AdmValues, AdmRecord> =
  executorType === "redis"
    ? injectRedisQueueWorkerExecutor<
      SeedAdmJobContext,
      AdmValues,
      AdmRecord
    >()
    : injectInMemoryQueueWorkerExecutor<
      SeedAdmJobContext,
      AdmValues,
      AdmRecord
    >();

executor.run({
  async init(context, { workerMetadata }) {
    console.log("processing worker", context);
    db = injectDbConnection(context.dbType);
    await db.connect(context.dbConnectionParams);

    console.log(`   [Processing worker #${workerMetadata.index}] Init`);

    const args = [
      context.config,
      context.dbType,
      db,
      context.ddlExtraOptions,
    ] as const;
    provincesDML = injectProvincesDML(...args);
    regionsDML = injectRegionsDML(...args);
    districtsDML = injectDistrictsDML(...args);
    communesDML = injectCommunesDML(...args);
  },
  async execute(context, messages, { workerMetadata, retryCount }) {
    const levelTitle = ADM_LEVEL_TITLE_BY_CODE.get(context.currentAdmLevel) ??
      "unknown";
    const retryLog = retryCount > 0 ? ` (retry #${retryCount})` : "";

    messages.forEach((m) => {
      let name = "";
      if (isFokontanyValues(m)) {
        name =
          `${m.fokontany} (${m.commune}, ${m.district}, ${m.region}, ${m.province})`;
      } else if (isCommuneValues(m)) {
        name = `${m.commune} (${m.district}, ${m.region}, ${m.province})`;
      } else if (isDistrictValues(m)) {
        name = `${m.district} (${m.region}, ${m.province})`;
      } else if (isRegionValues(m)) {
        name = `${m.region} (${m.province})`;
      } else if (isProvinceValues(m)) {
        name = m.province;
      }

      console.log(
        colors.magenta(
          `   [Processing worker #${workerMetadata.index}] processing ${levelTitle}: ${name}${retryLog}`,
        ),
      );
    });

    switch (context.currentAdmLevel) {
      case AdmLevelCode.FOKONTANY: {
        const fokontanyValues = messages.map((m) => {
          if (!isFokontanyValues(m)) {
            throw new Error(
              `[Processing worker #${workerMetadata.index}] Expected FokontanyValues for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m;
        });
        const communeAttributes: CommuneAttributes[] = [];
        const valuesByParentEncoding = new Map<string, FokontanyValues[]>();
        for (const values of fokontanyValues) {
          const parentAttributes: CommuneAttributes = {
            commune: values.commune,
            district: values.district,
            region: values.region,
          };
          const encoding = encodeCommuneAttributes(parentAttributes);
          const encodingValues = valuesByParentEncoding.get(encoding);
          if (!encodingValues) {
            valuesByParentEncoding.set(encoding, [values]);
            communeAttributes.push(parentAttributes);
          } else {
            encodingValues.push(values);
          }
        }
        const communes = await communesDML.getManyByAttributes(
          communeAttributes,
        );
        const fokontanyRecords: FokontanyRecord[] = [];
        for (const commune of communes) {
          const communeEncoding = encodeCommuneAttributes({
            commune: commune.commune,
            district: commune.district,
            region: commune.region,
          });
          const communeFokontanys = valuesByParentEncoding.get(communeEncoding);
          if (communeFokontanys) {
            for (const fokontany of communeFokontanys) {
              fokontanyRecords.push({
                ...fokontany,
                communeId: commune.id,
                districtId: commune.districtId,
                regionId: commune.regionId,
                provinceId: commune.provinceId,
              });
            }
          }
        }
        return fokontanyRecords;
      }
      case AdmLevelCode.COMMUNE: {
        const communeValues = messages.map((m) => {
          if (!isCommuneValues(m)) {
            throw new Error(
              `[Processing worker #${workerMetadata.index}] Expected CommuneValues for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m;
        });
        const districtAttributes: DistrictAttributes[] = [];
        const valuesByParentEncoding = new Map<string, CommuneValues[]>();
        for (const values of communeValues) {
          const parentAttributes: DistrictAttributes = {
            district: values.district,
            region: values.region,
          };
          const encoding = encodeDistrictAttributes(parentAttributes);
          const encodingValues = valuesByParentEncoding.get(encoding);
          if (!encodingValues) {
            valuesByParentEncoding.set(encoding, [values]);
            districtAttributes.push(parentAttributes);
          } else {
            encodingValues.push(values);
          }
        }
        const districts = await districtsDML.getManyByAttributes(
          districtAttributes,
        );
        const communeRecords: CommuneRecord[] = [];
        for (const district of districts) {
          const districtEncoding = encodeDistrictAttributes({
            district: district.district,
            region: district.region,
          });
          const districtCommunes = valuesByParentEncoding.get(districtEncoding);
          if (districtCommunes) {
            for (const commune of districtCommunes) {
              communeRecords.push({
                ...commune,
                districtId: district.id,
                regionId: district.regionId,
                provinceId: district.provinceId,
              });
            }
          }
        }
        return communeRecords;
      }
      case AdmLevelCode.DISTRICT: {
        const districtValues = messages.map((m) => {
          if (!isDistrictValues(m)) {
            throw new Error(
              `[Processing worker #${workerMetadata.index}] Expected DistrictValues for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m;
        });
        const regionNames = [...new Set(districtValues.map((v) => v.region))];
        const regions = await regionsDML.getManyByNames(regionNames);
        const regionByName = new Map(regions.map((r) => [r.region, r]));
        return districtValues.map((v) => {
          const region = regionByName.get(v.region);
          if (!region) {
            throw new Error(
              `[Processing worker #${workerMetadata.index}] Region not found for district ${v.district}: ${v.region}`,
            );
          }
          return {
            ...v,
            regionId: region.id,
            provinceId: region.provinceId,
          } as DistrictRecord;
        });
      }
      case AdmLevelCode.REGION: {
        const regionValues = messages.map((m) => {
          if (!isRegionValues(m)) {
            throw new Error(
              `[Processing worker #${workerMetadata.index}] Expected RegionValues for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m;
        });
        const provinceNames = [...new Set(regionValues.map((v) => v.province))];
        const provinces = await provincesDML.getManyByNames(provinceNames);
        const provinceIdByName = new Map(
          provinces.map((p) => [p.province, p.id]),
        );
        return regionValues.map((v) => {
          const provinceId = provinceIdByName.get(v.province);
          if (!provinceId) {
            throw new Error(
              `[Processing worker #${workerMetadata.index}] Province not found for region ${v.region}: ${v.province}`,
            );
          }
          return { ...v, provinceId } as RegionRecord;
        });
      }
      case AdmLevelCode.PROVINCE: {
        return messages.map((m) => {
          if (!isProvinceValues(m)) {
            throw new Error(
              `[Processing worker #${workerMetadata.index}] Expected ProvinceValues for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m as ProvinceRecord;
        });
      }
      default:
        break;
    }
  },
  async teardown(_, { workerMetadata }) {
    console.log(`   [Processing worker #${workerMetadata.index}] Teardown`);
    await db.close();
  },
});
