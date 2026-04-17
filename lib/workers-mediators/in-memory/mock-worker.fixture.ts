import { injectInMemoryQueueWorkerExecutor } from "./in-memory-queue.workers-mediator.ts";

const executor = injectInMemoryQueueWorkerExecutor<string, object, object>();

executor.run((context, batch, { workerMetadata }) => {
  if (workerMetadata.type === "process") {
    // Processing logic
    return batch.map((message) => {
      const id = (message as { id: number }).id;
      return { result: `Processed ${id}`, completed: id, ctx: context };
    });
  } else {
    // Insertion logic
    return batch.map((message) => {
      const res = (message as { result: string }).result;
      return { saved: res, ctx: context };
    });
  }
});
