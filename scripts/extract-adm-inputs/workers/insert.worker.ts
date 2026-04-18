/// <reference lib="deno.worker" />
import { InMemory, Redis } from "@scope/lib/workers-mediators";
import { injectPostgresDbConnection } from "@scope/adapters/postgres";
import { DbType } from "@scope/consts/db";
import type { ExtractAdmInputJobContext } from "../extract-adm-input.d.ts";
import type { GeoJSONFeature } from "@scope/types/utils";
import {
  ADM_LEVEL_TITLE_BY_CODE,
  type AdmLevelCode,
} from "@scope/consts/models";

const pg = injectPostgresDbConnection();

type Feature = GeoJSONFeature<{
  shapeName: string;
  shapeID: string;
  shapeType: string;
}>;

const executorType =
  new URL(self.location.href).searchParams.get("disable-redis") === "true"
    ? "in-memory"
    : "redis";

const executor = (executorType === "redis"
  ? Redis.injectRedisQueueWorkerExecutor<
    ExtractAdmInputJobContext,
    Feature,
    Feature
  >()
  : InMemory.injectInMemoryQueueWorkerExecutor<
    ExtractAdmInputJobContext,
    Feature,
    Feature
  >());

executor.run({
  async init(context, _options) {
    console.log(`[Insert Worker] init — level: ${context.currentAdmLevel}`);
    if (context.pgConnection) {
      await pg.connect({
        dbType: DbType.Postgres,
        connection: context.pgConnection,
      });
    }
  },
  execute(_context, batch) {
    return batch.map((feature) => {
      const levelTitle =
        ADM_LEVEL_TITLE_BY_CODE.get(
          feature.properties.shapeType as AdmLevelCode,
        ) ?? feature.properties.shapeType;
      console.log(
        `%c[Insert Worker] inserting ${levelTitle}: ${feature.properties.shapeName}`,
        "color: blue",
      );
      return feature;
    });
  },
  async teardown() {
    console.log("[Insert Worker] teardown");
    await pg.close();
  },
});
