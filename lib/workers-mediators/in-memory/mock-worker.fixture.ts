/// <reference lib="deno.worker" />
import { WORKER_EVENTS } from "../workers-mediators.const.ts";
import { injectInMemoryQueueWorkerExecutor } from "./in-memory-queue.workers-mediator.ts";

const processExecutor = injectInMemoryQueueWorkerExecutor(
  "process",
  WORKER_EVENTS.PROCESSING_FINISHED,
);
processExecutor.run((context, batch, _extra) => {
  // Return an array of results matching the input batch
  return batch.map((message) => {
    const id = (message as { id: number }).id;
    // The result here is used for both processing finished events and insert data
    return { result: `Processed ${id}`, completed: id, ctx: context };
  });
});

const insertExecutor = injectInMemoryQueueWorkerExecutor(
  "insert",
  WORKER_EVENTS.INSERT_FINISHED,
);
insertExecutor.run((context, batch, _extra) => {
  // Return an array of results matching the input batch
  return batch.map((message) => {
    const res = (message as { result: string }).result;
    return { saved: res, ctx: context };
  });
});
