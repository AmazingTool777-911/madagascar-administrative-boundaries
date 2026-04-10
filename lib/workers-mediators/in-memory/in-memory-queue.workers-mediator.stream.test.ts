import { assertEquals } from "@std/assert";
import { injectInMemoryQueueWorkersMediator } from "./in-memory-queue.workers-mediator.ts";

Deno.test("InMemoryQueueWorkersMediator - Streaming Input", async (t) => {
  await t.step(
    "successfully coordinates a streaming processing and insert pipeline",
    async () => {
      const mediator = injectInMemoryQueueWorkersMediator();

      const messages = [
        { id: 10, val: 10 },
        { id: 20, val: 20 },
        { id: 30, val: 30 },
      ];

      // Create a ReadableStream from the messages array
      const messageStream = new ReadableStream({
        start(controller) {
          for (const msg of messages) {
            controller.enqueue(msg);
          }
          controller.close();
        },
      });

      const worker1 = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );
      const worker2 = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );
      const insertWorker = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );

      const context = {
        processing: { factor: 2 },
        insert: { table: "results" },
      };

      const processedResults: unknown[] = [];
      const insertResults: unknown[] = [];

      await mediator.queue(
        context,
        messageStream,
        {
          processing: [worker1, worker2],
          insert: insertWorker,
        },
        {
          batchSize: 2,
          onProcessingFinished: (events) => {
            processedResults.push(...events);
          },
          onInsertFinished: (events) => {
            insertResults.push(...events);
          },
        },
      );

      // Verify processing results (3 messages processed)
      assertEquals(processedResults.length, 3);
      // Verify insert results (3 messages inserted)
      assertEquals(insertResults.length, 3);

      // Clean up workers
      worker1.terminate();
      worker2.terminate();
      insertWorker.terminate();
    },
  );
});
