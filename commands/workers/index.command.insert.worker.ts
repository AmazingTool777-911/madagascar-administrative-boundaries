import { injectDbConnection, injectProvincesDML } from "@scope/db";
import { injectRedisQueueWorkerExecutor } from "@scope/lib/redis-workers-mediators";
import { injectInMemoryQueueWorkerExecutor } from "@scope/lib/in-memory-workers-mediators";
import type {
  CommuneTableDML,
  DbConnection,
  DistrictTableDML,
  FokontanyTableDML,
  ProvinceTableDML,
  RegionTableDML,
} from "@scope/types/db";
import type { SeedAdmJobContext } from "@scope/types/command";
import type {
  AdmRecord,
  CommuneRecord,
  DistrictRecord,
  FokontanyRecord,
  ProvinceRecord,
  RegionRecord,
} from "@scope/types/models";
import { colors } from "@cliffy/ansi/colors";
import {
  injectCommunesDML,
  injectDistrictsDML,
  injectFokontanysDML,
  injectRegionsDML,
} from "@scope/db/dml";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import {
  isCommuneValues,
  isDistrictValues,
  isFokontanyValues,
  isProvinceValues,
  isRegionValues,
} from "@scope/helpers/models";
import { QueueWorkerExecutor } from "@scope/lib/workers-mediators";

let db!: DbConnection;

let provincesDML!: ProvinceTableDML;
let regionsDML!: RegionTableDML;
let districtsDML!: DistrictTableDML;
let communesDML!: CommuneTableDML;
let fokontanysDML!: FokontanyTableDML;

const executorType =
  new URL(self.location.href).searchParams.get("disable-redis") === "true"
    ? "in-memory"
    : "redis";

const executor: QueueWorkerExecutor<SeedAdmJobContext, AdmRecord, AdmRecord> =
  executorType === "redis"
    ? injectRedisQueueWorkerExecutor<
      SeedAdmJobContext,
      AdmRecord,
      AdmRecord
    >()
    : injectInMemoryQueueWorkerExecutor<
      SeedAdmJobContext,
      AdmRecord,
      AdmRecord
    >();

executor.run({
  async init(context) {
    db = injectDbConnection(context.dbType);
    await db.connect(context.dbConnectionParams);

    console.log(`   [Insert worker] Init`);

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
    fokontanysDML = injectFokontanysDML(...args);
  },
  async execute(context, messages, { retryCount }) {
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
        colors.blue(
          `   [Insert worker] inserting ${levelTitle}: ${name}${retryLog}`,
        ),
      );
    });

    switch (context.currentAdmLevel) {
      case AdmLevelCode.FOKONTANY: {
        const records = messages.map((m) => {
          if (!isFokontanyValues(m)) {
            throw new Error(
              `[Insert worker] Expected FokontanyRecord for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m as FokontanyRecord;
        });
        await fokontanysDML.createMany(records);
        return records;
      }
      case AdmLevelCode.COMMUNE: {
        const records = messages.map((m) => {
          if (!isCommuneValues(m)) {
            throw new Error(
              `[Insert worker] Expected CommuneRecord for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m as CommuneRecord;
        });
        await communesDML.createMany(records);
        return records;
      }
      case AdmLevelCode.DISTRICT: {
        const records = messages.map((m) => {
          if (!isDistrictValues(m)) {
            throw new Error(
              `[Insert worker] Expected DistrictRecord for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m as DistrictRecord;
        });
        await districtsDML.createMany(records);
        return records;
      }
      case AdmLevelCode.REGION: {
        const records = messages.map((m) => {
          if (!isRegionValues(m)) {
            throw new Error(
              `[Insert worker] Expected RegionRecord for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m as RegionRecord;
        });
        await regionsDML.createMany(records);
        return records;
      }
      case AdmLevelCode.PROVINCE: {
        const records = messages.map((m) => {
          if (!isProvinceValues(m)) {
            throw new Error(
              `[Insert worker] Expected ProvinceRecord for level ${context.currentAdmLevel}, but received: ${
                JSON.stringify(m)
              }`,
            );
          }
          return m as ProvinceRecord;
        });
        await provincesDML.createMany(records);
        return records;
      }
      default:
        break;
    }
  },
  async teardown() {
    console.log(`   [Insert worker] Teardown`);
    await db.close();
  },
});
