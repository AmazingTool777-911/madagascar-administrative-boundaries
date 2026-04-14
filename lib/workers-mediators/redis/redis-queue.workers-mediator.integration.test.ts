import { assertEquals, assertExists } from "@std/assert";
import { injectRedisConnection } from "../../../redis/redis.connection.ts";
import { injectRedisQueueWorkersMediator } from "./redis-queue.workers-mediator.ts";
import {
  resolveNumber,
  resolveString,
} from "../../../helpers/cli-args-env-resolvers.helper.ts";

interface TestPayload {
  id: string;
  integrated: boolean;
  timestamp: number;
}

// Helper to wait for a condition or timeout
async function waitFor(
  condition: () => boolean | Promise<boolean>,
  name: string,
  timeout = 15000,
): Promise<void> {
  const start = Date.now();
  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error(`Timeout waiting for condition: ${name}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

Deno.test({
  name: "RedisQueueWorkersMediator Integration Test",
  fn: async (t) => {
    // 1. Setup Redis Connection
    const host = resolveString(undefined, "REDIS_HOST", "localhost");
    const port = resolveNumber(undefined, "REDIS_PORT", 6379);

    const redis = injectRedisConnection();
    await redis.connect({ host, port });
    const client = redis.client;

    // cleanup helper
    const cleanup = async () => {
      await client.sendCommand([
        "DEL",
        "processing:stream",
        "insert:stream",
        "processing:dlq",
        "insert:dlq",
        "persisted-last:message",
        "persisted-last-insert:message",
        "processing:context",
        "insert:context",
      ]);
      // XGROUP logic might need explicit group deletion if we want full isolation
      try {
        await client.sendCommand([
          "XGROUP",
          "DESTROY",
          "processing:stream",
          "processing-group",
        ]);
      } catch (_) {
        /* Ignore if group doesn't exist */
      }
      try {
        await client.sendCommand([
          "XGROUP",
          "DESTROY",
          "insert:stream",
          "insert-group",
        ]);
      } catch (_) {
        /* Ignore if group doesn't exist */
      }
    };

    await cleanup();

    await t.step("Full Stage 1 -> Stage 2 Pipeline", async () => {
      const mediator = injectRedisQueueWorkersMediator(client, { host, port });

      // Create workers
      const procWorker = new Worker(
        import.meta.resolve("./integration-test.worker.ts"),
        {
          type: "module",
          deno: { permissions: "inherit" },
          // deno-lint-ignore no-explicit-any
        } as any,
      );
      const insWorker = new Worker(
        import.meta.resolve("./integration-test.worker.ts"),
        {
          type: "module",
          deno: { permissions: "inherit" },
          // deno-lint-ignore no-explicit-any
        } as any,
      );

      const finishedPayloads: TestPayload[] = [];
      const insertedPayloads: TestPayload[] = [];

      // Start the mediator
      const executionPromise = mediator.queue(
        { batchId: "test-run" },
        [{ id: "msg-1" }, { id: "msg-2" }],
        {
          processing: [procWorker],
          insert: insWorker,
        },
        {
          onProcessingFinished: (p) => {
            console.log(
              `[Test] onProcessingFinished called with ${p.length} items`,
            );
            finishedPayloads.push(...(p as TestPayload[]));
          },
          onInsertFinished: (p) => {
            console.log(
              `[Test] onInsertFinished called with ${p.length} items`,
            );
            insertedPayloads.push(...(p as TestPayload[]));
          },
          batchSize: 2,
        },
      );

      // Verify Stage 1 completion
      await waitFor(
        () => finishedPayloads.length === 2,
        "Stage 1 finished payloads",
      );
      console.log(`[Test] Stage 1 verified.`);
      assertEquals(finishedPayloads.length, 2);
      assertExists(finishedPayloads[0].integrated);

      // Verify Stage 2 completion
      await waitFor(
        () => insertedPayloads.length === 2,
        "Stage 2 inserted payloads",
      );
      console.log(`[Test] Stage 2 verified.`);
      assertEquals(insertedPayloads.length, 2);
      assertExists(insertedPayloads[0].integrated);

      // Wait for everything to settle
      await executionPromise;

      // Verify Redis final state
      // Verify Redis final state (should be cleaned up by the mediator)
      const insertStreamLagResult = await client.sendCommand([
        "XLEN",
        "insert:stream",
      ]);
      assertEquals(
        insertStreamLagResult,
        0,
        "Insert stream should be cleaned up (length 0)",
      );

      const procKeyExists = await client.sendCommand([
        "EXISTS",
        "persisted-last:message",
      ]);
      assertEquals(procKeyExists, 0, "Producer key should be cleaned up");

      // Cleanup workers
      procWorker.terminate();
      insWorker.terminate();
    });

    await cleanup();
    redis.close();
    console.log(`[Test] Redis connection closed. Test finished.`);
  },
});
