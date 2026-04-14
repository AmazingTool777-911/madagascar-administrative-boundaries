/// <reference lib="deno.worker" />
import { injectRedisQueueWorkerExecutor } from "./redis-queue.workers-mediator.ts";

/**
 * A simple worker that performs an identity transformation for integration testing.
 */
interface TestMessage {
  id: string;
}
interface TestPayload {
  id: string;
  integrated: boolean;
  timestamp: number;
}

const executor = injectRedisQueueWorkerExecutor<
  unknown,
  TestMessage,
  TestPayload
>();

executor.run((_context, batch, _extra) => {
  // Identity transformation: return what we received
  return batch.map((msg) => ({
    ...msg,
    integrated: true,
    timestamp: Date.now(),
  }));
});
