import { assertEquals } from "@std/assert";
import { injectInMemoryQueueWorkersMediator } from "./in-memory-queue.workers-mediator.ts";

Deno.test("InMemoryQueueWorkersMediator", async (t) => {
  await t.step(
    "successfully coordinates a split processing and insert pipeline",
    async () => {
      // 1. Create a fresh mediator for testing
      const mediator = injectInMemoryQueueWorkersMediator();

      // 2. Instantiate mock workers pointing to the fixture
      const processingWorker1 = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );
      const processingWorker2 = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );
      const insertWorker = new Worker(
        import.meta.resolve("./mock-worker.fixture.ts"),
        { type: "module" },
      );

      // 3. Define the batch of messages and tracking arrays
      const messages = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const finishedEvents: Array<{ completed: number; ctx: string }> = [];
      const insertEvents: Array<{ saved: string; ctx: string }> = [];

      // 4. Run the queue
      await mediator.queue(
        { processing: "proc-ctx", insert: "ins-ctx" },
        messages,
        {
          processing: [processingWorker1, processingWorker2],
          insert: insertWorker,
        },
        {
          onProcessingFinished: (evt) => {
            finishedEvents.push(
              ...(evt as Array<{ completed: number; ctx: string }>),
            );
          },
          onInsertFinished: (evt) => {
            insertEvents.push(
              ...(evt as Array<{ saved: string; ctx: string }>),
            );
          },
          batchSize: 2,
        },
      );

      // 5. Assert Processing Output
      assertEquals(finishedEvents.length, 3);
      const completedIds = finishedEvents.map((e) => e.completed).sort();
      assertEquals(completedIds, [1, 2, 3]);
      assertEquals(finishedEvents[0].ctx, "proc-ctx");

      // 6. Assert Insertion Output
      assertEquals(insertEvents.length, 3);
      const savedResults = insertEvents.map((e) => e.saved).sort();
      assertEquals(savedResults, ["Processed 1", "Processed 2", "Processed 3"]);
      assertEquals(insertEvents[0].ctx, "ins-ctx");

      // 7. Teardown
      processingWorker1.terminate();
      processingWorker2.terminate();
      insertWorker.terminate();
    },
  );
});
