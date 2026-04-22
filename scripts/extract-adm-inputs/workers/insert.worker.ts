/// <reference lib="deno.worker" />
import { InMemory, Redis } from "@scope/lib/workers-mediators";
import {
  CommunesPostgresDML,
  DistrictsPostgresDML,
  injectCommunesPostgresDML,
  injectDistrictsPostgresDML,
  injectPostgresDbConnection,
  injectProvincesPostgresDML,
  injectRegionsPostgresDML,
  ProvincesPostgresDML,
  RegionsPostgresDML,
} from "@scope/adapters/postgres";
import { DbType } from "@scope/consts/db";
import type { ExtractAdmInputJobContext } from "../extract-adm-input.d.ts";
import { ADM_LEVEL_TITLE_BY_CODE, AdmLevelCode } from "@scope/consts/models";
import {
  type AdmRecords,
  type AdmValuesDiscriminated,
  type CommuneRecord,
  type DistrictRecord,
  type ProvinceRecord,
  type RegionRecord,
} from "@scope/types/models";
import {
  isCommuneValues,
  isDistrictValues,
  isProvinceValues,
  isRegionValues,
} from "@scope/helpers/models";

const pg = injectPostgresDbConnection();

let provincesDML!: ProvincesPostgresDML;
let regionsDML!: RegionsPostgresDML;
let districtsDML!: DistrictsPostgresDML;
let communesDML!: CommunesPostgresDML;

const executorType =
  new URL(self.location.href).searchParams.get("disable-redis") === "true"
    ? "in-memory"
    : "redis";

const executor = executorType === "redis"
  ? Redis.injectRedisQueueWorkerExecutor<
    ExtractAdmInputJobContext,
    AdmRecords,
    AdmValuesDiscriminated
  >()
  : InMemory.injectInMemoryQueueWorkerExecutor<
    ExtractAdmInputJobContext,
    AdmRecords,
    AdmValuesDiscriminated
  >();

executor.run({
  async init(context, _options) {
    console.log(`   [Insert Worker] init — level: ${context.currentAdmLevel}`);
    if (context.pgConnection) {
      await pg.connect({
        dbType: DbType.Postgres,
        connection: context.pgConnection,
      });
      provincesDML = injectProvincesPostgresDML(context.config, pg, context.pgSchema);
      regionsDML = injectRegionsPostgresDML(context.config, pg, context.pgSchema);
      districtsDML = injectDistrictsPostgresDML(context.config, pg, context.pgSchema);
      communesDML = injectCommunesPostgresDML(context.config, pg, context.pgSchema);
    }
  },
  async execute(_context, batch, { retryCount }) {
    const retryLog = retryCount > 0 ? ` (retry #${retryCount})` : "";
    switch (_context.currentAdmLevel) {
      case AdmLevelCode.PROVINCE: {
        const records: ProvinceRecord[] = batch.map((value) => {
          if (!isProvinceValues(value)) {
            throw new Error("Invalid province values");
          }
          return value as ProvinceRecord;
        });
        records.forEach((record) => {
          console.log(
            `%c   [Insert Worker] inserting ${
              ADM_LEVEL_TITLE_BY_CODE.get(
                AdmLevelCode.PROVINCE,
              )
            }: ${record.province}${retryLog}`,
            "color: blue",
          );
        });
        await provincesDML.createMany(records);
        return records.map<AdmValuesDiscriminated>((record) => ({
          admLevelCode: AdmLevelCode.PROVINCE,
          values: record,
        }));
      }

      case AdmLevelCode.REGION: {
        const records: RegionRecord[] = batch.map((value) => {
          if (!isRegionValues(value)) {
            throw new Error("Invalid region values");
          }
          return value as RegionRecord;
        });
        records.forEach((record) => {
          console.log(
            `%c   [Insert Worker] inserting ${
              ADM_LEVEL_TITLE_BY_CODE.get(
                AdmLevelCode.REGION,
              )
            }: ${record.region}${retryLog}`,
            "color: blue",
          );
        });
        await regionsDML.createMany(records);
        return records.map<AdmValuesDiscriminated>((record) => ({
          admLevelCode: AdmLevelCode.REGION,
          values: record,
        }));
      }

      case AdmLevelCode.DISTRICT: {
        const records: DistrictRecord[] = batch.map((value) => {
          if (!isDistrictValues(value)) {
            throw new Error("Invalid district values");
          }
          return value as DistrictRecord;
        });
        records.forEach((record) => {
          console.log(
            `%c   [Insert Worker] inserting ${
              ADM_LEVEL_TITLE_BY_CODE.get(
                AdmLevelCode.DISTRICT,
              )
            }: ${record.district}${retryLog}`,
            "color: blue",
          );
        });
        await districtsDML.createMany(records);
        return records.map<AdmValuesDiscriminated>((record) => ({
          admLevelCode: AdmLevelCode.DISTRICT,
          values: record,
        }));
      }

      case AdmLevelCode.COMMUNE: {
        const records: CommuneRecord[] = batch.map((value) => {
          if (!isCommuneValues(value)) {
            throw new Error("Invalid commune values");
          }
          return value as CommuneRecord;
        });
        records.forEach((record) => {
          console.log(
            `%c   [Insert Worker] inserting ${
              ADM_LEVEL_TITLE_BY_CODE.get(
                AdmLevelCode.COMMUNE,
              )
            }: ${record.commune}${retryLog}`,
            "color: blue",
          );
        });
        await communesDML.createMany(records);
        return records.map<AdmValuesDiscriminated>((record) => ({
          admLevelCode: AdmLevelCode.COMMUNE,
          values: record,
        }));
      }

      default:
        break;
    }
  },
  async teardown() {
    console.log("   [Insert Worker] teardown");
    await pg.close();
  },
});
