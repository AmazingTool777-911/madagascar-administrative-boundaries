import type { RedisClient } from "@iuioiua/redis";
import type { RedisConnectionParams } from "@scope/redis";
import { injectRedisConnection } from "@scope/redis";
import type {
  QueueOptions,
  QueueWorkerExecutor,
  QueueWorkerLifecycle,
  QueueWorkersMediator,
  WorkerBatchContext,
  WorkerPool,
} from "../workers-mediators.d.ts";
import {
  DEFAULT_MAX_RETRIES,
  WORKER_EVENTS,
} from "../workers-mediators.const.ts";

/** Default key for storing processing queue context in Redis. */
export const DEFAULT_PROCESSING_CONTEXT_KEY = "processing:context";
/** Default key for the processing queue Redis stream. */
export const DEFAULT_PROCESSING_STREAM_KEY = "processing:stream";
/** Default key for storing insert queue context in Redis. */
export const DEFAULT_INSERT_CONTEXT_KEY = "insert:context";
/** Default key for the insert queue Redis stream. */
export const DEFAULT_INSERT_STREAM_KEY = "insert:stream";
/** Default timeout for XREAD BLOCK in milliseconds. */
export const DEFAULT_XREAD_BLOCK_DURATION = 5000;
/** Default name for the processing Redis consumer group. */
export const DEFAULT_PROCESSING_CONSUMER_GROUP_NAME = "processing-group";
/** Default name for the insert Redis consumer group. */
export const DEFAULT_INSERT_CONSUMER_GROUP_NAME = "insert-group";
/** Default key for storing the last added message in Redis. */
export const DEFAULT_PERSISTED_LAST_MESSAGE_KEY = "persisted-last:message";
/** Default key for storing the last added insert message in Redis. */
export const DEFAULT_PERSISTED_LAST_INSERT_MESSAGE_KEY =
  "persisted-last-insert:message";
/** Default healthcheck interval for workers in milliseconds. */
export const DEFAULT_HEALTHCHECK_INTERVAL = 10000;
/** Default threshold for claiming pending messages in milliseconds. */
export const DEFAULT_PENDING_MIN_DURATION_THRESHOLD = 60000;
/** Default key for the processing DLQ Redis stream. */
export const DEFAULT_PROCESSING_DLQ_STREAM_KEY = "processing:dlq";
/** Default key for the insert DLQ Redis stream. */
export const DEFAULT_INSERT_DLQ_STREAM_KEY = "insert:dlq";

/**
 * Optional configuration for Redis keys used by the mediator.
 */
export interface RedisQueueWorkersMediatorOptions<TMessage = unknown> {
  /** Redis key for the processing queue context. */
  processingContextKey?: string;
  /** Redis key for the processing queue messages stream. */
  processingStreamKey?: string;
  /** Redis key for the insert queue context. */
  insertContextKey?: string;
  /** Redis key for the insert queue messages stream. */
  insertStreamKey?: string;
  /** Timeout for XREAD BLOCK in milliseconds. */
  xreadBlockDuration?: number;
  /** Name of the processing Redis consumer group. */
  processingConsumerGroupName?: string;
  /** Name of the insert Redis consumer group. */
  insertConsumerGroupName?: string;
  /** Redis key for the last added message. */
  persistedLastMessageKey?: string;
  /** Redis key for the last added insert message. */
  persistedLastInsertMessageKey?: string;
  /** Redis key for the processing DLQ stream. */
  processingDlqStreamKey?: string;
  /** Redis key for the insert DLQ stream. */
  insertDlqStreamKey?: string;
  /** Interval for the worker healthcheck in milliseconds. */
  healthcheckInterval?: number;
  /** Minimum duration threshold for claiming pending messages in milliseconds. */
  pendingMinDurationThreshold?: number;
}

/**
 * The message payload sent from the main thread to a worker on initialization.
 */
interface WorkerInitMessage {
  /** The event type identifier. */
  type: string;
  /** The MessagePort for bidirectional communication. */
  port: MessagePort;
  /** Redis connection parameters. */
  redisConfig: RedisConnectionParams;
  /** The role of this worker in the pipeline. */
  workerType: "process" | "insert";
  /** Metadata identifying this worker instance. */
  workerMetadata: { type: "process" | "insert"; index: number };
  /** The size of the message batches to process. */
  batchSize: number;
  /** Maximum number of retries per batch. */
  maxRetries: number;
  /** Mediator configuration options derived from the main thread. */
  mediatorOptions: Omit<Required<RedisQueueWorkersMediatorOptions>, "never">;
}

/**
 * Higher-level abstraction for executing and monitoring a worker's lifecycle
 * within the context of a Redis-backed queue.
 */
class RedisQueueWorkerExecution<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
> {
  #worker: Worker;
  #type: "process" | "insert";
  #status: "idle" | "running" | "interrupted" | "stopped" = "idle";
  #error: unknown = null;
  #redisConfig: RedisConnectionParams;
  // deno-lint-ignore no-explicit-any
  #mediatorOptions: RedisQueueWorkersMediatorOptions<any>;
  #onDone: () => void;
  #onInterrupted: (err: unknown) => void;
  #onFinished: (payload: TFinishedPayload[]) => void;
  #port: MessagePort | null = null;
  #workerIndex: number;
  #batchSize: number;
  #maxRetries: number;

  constructor(
    worker: Worker,
    type: "process" | "insert",
    workerIndex: number,
    redisConfig: RedisConnectionParams,
    // deno-lint-ignore no-explicit-any
    mediatorOptions: RedisQueueWorkersMediatorOptions<any>,
    batchSize: number,
    maxRetries: number,
    callbacks: {
      onDone: () => void;
      onInterrupted: (err: unknown) => void;
      onFinished: (payload: TFinishedPayload[]) => void;
    },
  ) {
    this.#worker = worker;
    this.#type = type;
    this.#workerIndex = workerIndex;
    this.#redisConfig = redisConfig;
    this.#mediatorOptions = mediatorOptions;
    this.#onDone = callbacks.onDone;
    this.#onInterrupted = callbacks.onInterrupted;
    this.#onFinished = callbacks.onFinished;
    this.#batchSize = batchSize;
    this.#maxRetries = maxRetries;
  }

  get status() {
    return this.#status;
  }

  get error() {
    return this.#error;
  }

  /**
   * Initializes the worker by sending the Redis configuration and establishing a message port.
   */
  init() {
    this.#status = "running";
    const { port1, port2 } = new MessageChannel();
    this.#port = port1;

    this.#worker.postMessage(
      {
        type: WORKER_EVENTS.INIT,
        redisConfig: this.#redisConfig,
        mediatorOptions: this.#mediatorOptions,
        workerType: this.#type,
        workerMetadata: {
          type: this.#type,
          index: this.#workerIndex,
        },
        batchSize: this.#batchSize,
        maxRetries: this.#maxRetries,
        port: port2,
      },
      [port2],
    );

    this.#port.onmessage = (event) => {
      const { type, payload, error } = event.data;
      switch (type) {
        case WORKER_EVENTS.DONE:
          this.#status = "stopped";
          this.#onDone();
          break;
        case WORKER_EVENTS.INTERRUPTED:
          this.#status = "interrupted";
          this.#error = error;
          this.#onInterrupted(error);
          break;
        case WORKER_EVENTS.FINISHED:
          this.#onFinished(payload);
          break;
      }
    };
  }

  /**
   * Stops the worker execution.
   */
  stop() {
    this.#status = "stopped";
    this.#port?.close();
  }
}

/**
 * A Redis-backed implementation of the QueueWorkersMediator interface.
 * Coordinates a two-stage worker pipeline using Redis streams for message queuing
 * and Redis hashes for context storage.
 */
export class RedisQueueWorkersMediator<
  TProcessingContext = unknown,
  TMessage extends object = object,
  TProcessingFinishedPayload = unknown,
  TInsertContext = unknown,
  TInsertFinishedPayload = unknown,
> implements QueueWorkersMediator<
  TProcessingContext,
  TMessage,
  TProcessingFinishedPayload,
  TInsertContext,
  TInsertFinishedPayload
> {
  #client: RedisClient;
  #redisConfig: RedisConnectionParams;
  #options: Required<RedisQueueWorkersMediatorOptions<TMessage>>;
  #processingExecutions: RedisQueueWorkerExecution<
    TProcessingContext,
    TMessage,
    TProcessingFinishedPayload
  >[] = [];
  #insertExecution?: RedisQueueWorkerExecution<
    TInsertContext,
    TMessage,
    TInsertFinishedPayload
  >;

  /**
   * Initializes a new RedisQueueWorkersMediator.
   *
   * @param client - An active Redis client instance.
   * @param redisConfig - Connection parameters for Redis.
   * @param options - Optional custom keys for Redis storage.
   */
  constructor(
    client: RedisClient,
    redisConfig: RedisConnectionParams,
    options: RedisQueueWorkersMediatorOptions<TMessage> = {},
  ) {
    this.#client = client;
    this.#redisConfig = redisConfig;
    this.#options = {
      processingContextKey:
        options.processingContextKey ?? DEFAULT_PROCESSING_CONTEXT_KEY,
      processingStreamKey:
        options.processingStreamKey ?? DEFAULT_PROCESSING_STREAM_KEY,
      insertContextKey: options.insertContextKey ?? DEFAULT_INSERT_CONTEXT_KEY,
      insertStreamKey: options.insertStreamKey ?? DEFAULT_INSERT_STREAM_KEY,
      xreadBlockDuration:
        options.xreadBlockDuration ?? DEFAULT_XREAD_BLOCK_DURATION,
      processingConsumerGroupName:
        options.processingConsumerGroupName ??
        DEFAULT_PROCESSING_CONSUMER_GROUP_NAME,
      insertConsumerGroupName:
        options.insertConsumerGroupName ?? DEFAULT_INSERT_CONSUMER_GROUP_NAME,
      persistedLastMessageKey:
        options.persistedLastMessageKey ?? DEFAULT_PERSISTED_LAST_MESSAGE_KEY,
      persistedLastInsertMessageKey:
        options.persistedLastInsertMessageKey ??
        DEFAULT_PERSISTED_LAST_INSERT_MESSAGE_KEY,
      processingDlqStreamKey:
        options.processingDlqStreamKey ?? DEFAULT_PROCESSING_DLQ_STREAM_KEY,
      insertDlqStreamKey:
        options.insertDlqStreamKey ?? DEFAULT_INSERT_DLQ_STREAM_KEY,
      healthcheckInterval:
        options.healthcheckInterval ?? DEFAULT_HEALTHCHECK_INTERVAL,
      pendingMinDurationThreshold:
        options.pendingMinDurationThreshold ??
        DEFAULT_PENDING_MIN_DURATION_THRESHOLD,
    };
  }

  /**
   * Enqueues a batch of messages for processing.
   *
   * @param context - Contextual data for the batch.
   * @param messages - Messages to process.
   * @param workers - The pool of workers.
   * @param options - Configuration options for the queue execution (listeners, batchSize).
   */
  async queue(
    context: WorkerBatchContext<TProcessingContext, TInsertContext>,
    messages: TMessage[] | ReadableStream<TMessage>,
    workers: WorkerPool,
    options: QueueOptions<
      TProcessingFinishedPayload,
      TInsertFinishedPayload
    > = {},
  ): Promise<void> {
    const {
      onProcessingFinished,
      onInsertFinished,
      batchSize = 1,
      maxRetries = DEFAULT_MAX_RETRIES,
    } = options;

    const processingWorkers = Array.isArray(workers)
      ? workers
      : workers.processing;
    const insertWorker = Array.isArray(workers) ? undefined : workers.insert;

    // 1. Set the context into redis
    const isSplitContext =
      context &&
      typeof context === "object" &&
      ("processing" in context || "insert" in context);
    const processingContext = isSplitContext
      ? (context as { processing: TProcessingContext }).processing
      : (context as TProcessingContext);
    const insertContext = isSplitContext
      ? (context as { insert: TInsertContext }).insert
      : (undefined as unknown as TInsertContext);

    const contextCommands: string[][] = [
      [
        "SET",
        this.#options.processingContextKey,
        JSON.stringify(processingContext),
      ],
    ];
    if (insertContext) {
      contextCommands.push([
        "SET",
        this.#options.insertContextKey,
        JSON.stringify(insertContext),
      ]);
    }
    await this.#client.pipelineCommands(contextCommands);

    // 2. Initialize producer keys to prevent workers from exiting immediately
    const initProducerCommands: string[][] = [
      [
        "SET",
        this.#options.persistedLastMessageKey,
        JSON.stringify("INITIALIZING"),
      ],
    ];
    if (insertWorker) {
      initProducerCommands.push([
        "SET",
        this.#options.persistedLastInsertMessageKey,
        JSON.stringify("INITIALIZING"),
      ]);
    }
    await this.#client.pipelineCommands(initProducerCommands);

    // 3. Create a readable stream that stream the messages in batches
    const messagesStream = Array.isArray(messages)
      ? (() => {
          let index = 0;
          return new ReadableStream<TMessage>({
            pull(controller) {
              if (index < messages.length) {
                controller.enqueue(messages[index++]);
              } else {
                controller.close();
              }
            },
          });
        })()
      : messages;

    const batcher = (() => {
      let currentBatch: TMessage[] = [];
      return new TransformStream<TMessage, TMessage[]>({
        transform: (chunk, controller) => {
          currentBatch.push(chunk);
          if (currentBatch.length >= batchSize) {
            controller.enqueue(currentBatch);
            currentBatch = [];
          }
        },
        flush: (controller) => {
          if (currentBatch.length > 0) {
            controller.enqueue(currentBatch);
          }
        },
      });
    })();

    const enqueuer = new WritableStream<TMessage[]>({
      write: async (batch) => {
        const lastMsg = batch[batch.length - 1];
        const commands: string[][] = [["MULTI"]];

        for (const msg of batch) {
          commands.push([
            "XADD",
            this.#options.processingStreamKey,
            "*",
            "data",
            JSON.stringify(msg),
          ]);
        }

        commands.push([
          "SET",
          this.#options.persistedLastMessageKey,
          JSON.stringify(lastMsg),
        ]);
        commands.push(["EXEC"]);

        await this.#client.pipelineCommands(commands);
      },
      close: async () => {
        await this.#client.sendCommand([
          "DEL",
          this.#options.persistedLastMessageKey,
        ]);
      },
    });

    const pipelineDone = messagesStream.pipeThrough(batcher).pipeTo(enqueuer);

    // 4. Monitoring loop
    let restartLoop = false;
    do {
      restartLoop = false;

      let insertDonePromise = Promise.resolve();
      let resolveInsertDone: () => void;
      if (insertWorker) {
        insertDonePromise = new Promise((resolve) => {
          resolveInsertDone = resolve;
        });
      }

      let processingDonePromise = Promise.resolve();
      let resolveProcessingDone: () => void;
      processingDonePromise = new Promise((resolve) => {
        resolveProcessingDone = resolve;
      });

      let workersDoneCount = 0;

      const processingExecutions = processingWorkers.map((w, i) => {
        const exec = new RedisQueueWorkerExecution<
          TProcessingContext,
          TMessage,
          TProcessingFinishedPayload
        >(
          w,
          "process",
          i,
          this.#redisConfig,
          this.#options,
          batchSize,
          maxRetries,
          {
            onDone: () => {
              workersDoneCount++;
              if (workersDoneCount === processingWorkers.length) {
                resolveProcessingDone();
                if (insertExecution?.status === "idle") {
                  insertExecution.init();
                }
              }
            },
            onInterrupted: (err) => {
              if (
                processingExecutions.every((w) => w.status === "interrupted")
              ) {
                throw err;
              }
            },
            onFinished: (payload: TProcessingFinishedPayload[]) => {
              onProcessingFinished?.(payload);
              if (insertExecution?.status === "idle") {
                insertExecution.init();
              }
            },
          },
        );
        this.#processingExecutions.push(exec);
        return exec;
      });

      processingExecutions.forEach((exec) => exec.init());

      let insertExecution: RedisQueueWorkerExecution<
        TInsertContext,
        TProcessingFinishedPayload,
        TInsertFinishedPayload
      > | null = null;

      if (insertWorker) {
        insertExecution = new RedisQueueWorkerExecution<
          TInsertContext,
          TProcessingFinishedPayload,
          TInsertFinishedPayload
        >(
          insertWorker,
          "insert",
          0,
          this.#redisConfig,
          this.#options,
          batchSize,
          maxRetries,
          {
            onDone: () => {
              resolveInsertDone();
            },
            onInterrupted: (err: unknown) => {
              throw err;
            },
            onFinished: (payload: TInsertFinishedPayload[]) => {
              onInsertFinished?.(payload);
            },
          },
        );
        this.#insertExecution = insertExecution;
      }

      const healthcheck = setInterval(() => {
        processingExecutions.forEach((exec) => {
          if (exec.status === "interrupted") {
            exec.init();
          }
        });
      }, this.#options.healthcheckInterval);

      await Promise.all([
        pipelineDone,
        processingDonePromise,
        insertDonePromise,
      ]);
      // console.log(`[Mediator] Promise.all resolved.`);
      clearInterval(healthcheck);

      /**
       * Uses XINFO STREAM to check if a stream or its corresponding DLQ has
       * undelivered messages (stream length > 0) or pending (delivered but
       * unacknowledged) messages via the consumer group info.
       */
      const checkStreamActivity = async (
        stream: string,
        dlq: string,
        _group: string,
      ) => {
        const checkOne = async (key: string) => {
          try {
            const infoCmd = await this.#client.sendCommand([
              "XINFO",
              "STREAM",
              key,
            ]);
            // deno-lint-ignore no-explicit-any
            const info = infoCmd as any[];
            // XINFO STREAM returns a flat array; "length" is at index 1
            const length = info[1] as number;
            if (length > 0) return true;
            const groupsCmd = await this.#client.sendCommand([
              "XINFO",
              "GROUPS",
              key,
            ]);
            // deno-lint-ignore no-explicit-any
            const groups = groupsCmd as any[][];
            // Each group entry is a flat array; "pending" is at index 5
            return groups.some((g) => (g[5] as number) > 0);
          } catch {
            return false;
          }
        };
        return (await checkOne(stream)) || (await checkOne(dlq));
      };

      const processingIsNonEmpty = await checkStreamActivity(
        this.#options.processingStreamKey,
        this.#options.processingDlqStreamKey,
        this.#options.processingConsumerGroupName,
      );
      const insertIsNonEmpty = insertExecution
        ? await checkStreamActivity(
            this.#options.insertStreamKey,
            this.#options.insertDlqStreamKey,
            this.#options.insertConsumerGroupName,
          )
        : false;

      if (processingIsNonEmpty || insertIsNonEmpty) {
        restartLoop = confirm(
          "[Mediator] Pending messages or lag detected after loop execution. Do you want to restart the worker loop to process them?",
        );

        if (!restartLoop) {
          throw new Error(
            "Extraction aborted: pending messages or lag detected after loop execution.",
          );
        }
      }
    } while (restartLoop);

    this.stop();
  }

  /**
   * Stops all active workers and closes their communication ports.
   */
  stop() {
    for (const execution of this.#processingExecutions) {
      execution.stop();
    }
    this.#insertExecution?.stop();
    this.#processingExecutions = [];
    this.#insertExecution = undefined;
  }

  /**
   * Retrieves the persisted context data for the processing stage.
   */
  get persistedContext(): Promise<TProcessingContext | null> {
    return (async () => {
      const raw = (await this.#client.sendCommand([
        "GET",
        this.#options.processingContextKey,
      ])) as string | null;

      return raw ? (JSON.parse(raw) as TProcessingContext) : null;
    })();
  }

  /**
   * Retrieves the last processing message that was processed or added.
   */
  get persistedLastMessage(): Promise<TMessage | null> {
    return (async () => {
      const raw = (await this.#client.sendCommand([
        "GET",
        this.#options.persistedLastMessageKey,
      ])) as string | null;
      return raw ? (JSON.parse(raw) as TMessage) : null;
    })();
  }

  /**
   * Clears ONLY the queue-related data (including streams and DLQs).
   */
  async clearQueue(): Promise<void> {
    const keys = [
      this.#options.processingStreamKey,
      this.#options.insertStreamKey,
      this.#options.processingDlqStreamKey,
      this.#options.insertDlqStreamKey,
    ];
    await this.#client.sendCommand(["DEL", ...keys]);
  }

  /**
   * Clears all persisted data (context, streams, last message).
   */
  async clearPersisted(): Promise<void> {
    const keys = [
      this.#options.processingContextKey,
      this.#options.insertContextKey,
      this.#options.processingStreamKey,
      this.#options.insertStreamKey,
      this.#options.persistedLastMessageKey,
      this.#options.processingDlqStreamKey,
      this.#options.insertDlqStreamKey,
    ];
    await this.#client.sendCommand(["DEL", ...keys]);
  }
}

/**
 * Executes a specific worker role (process or insert) using Redis queue.
 *
 * @typeParam TContext - Contextual data supplied to the executor.
 * @typeParam TMessage - The shape of the incoming messages to process.
 * @typeParam TFinishedPayload - The type of data emitted when processing is finished.
 */
export class RedisQueueWorkerExecutor<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
> implements QueueWorkerExecutor<TContext, TMessage, TFinishedPayload> {
  /**
   * Runs the worker by registering the lifecycle callbacks to process incoming messages.
   */
  run(
    handler:
      | QueueWorkerLifecycle<TContext, TMessage, TFinishedPayload>
      | QueueWorkerLifecycle<TContext, TMessage, TFinishedPayload>["execute"],
  ): void {
    const init = typeof handler === "function" ? undefined : handler.init;
    const execute = typeof handler === "function" ? handler : handler.execute;
    const teardown =
      typeof handler === "function" ? undefined : handler.teardown;

    self.addEventListener("message", async (event) => {
      const {
        type,
        port,
        redisConfig,
        workerType,
        workerMetadata,
        batchSize: _batchSize,
        maxRetries,
        mediatorOptions,
      } = (event as MessageEvent<WorkerInitMessage>).data;
      if (type !== WORKER_EVENTS.INIT) return;

      const redis = injectRedisConnection();
      await redis.connect(redisConfig);
      const client = redis.client;

      const streamKey =
        workerType === "process"
          ? mediatorOptions.processingStreamKey
          : mediatorOptions.insertStreamKey;
      const groupName =
        workerType === "process"
          ? mediatorOptions.processingConsumerGroupName
          : mediatorOptions.insertConsumerGroupName;
      const consumerName = `worker-${workerMetadata.type}-${workerMetadata.index}`;
      const dlqKey =
        workerType === "process"
          ? mediatorOptions.processingDlqStreamKey
          : mediatorOptions.insertDlqStreamKey;
      const nextStreamKey =
        workerType === "process" ? mediatorOptions.insertStreamKey : null;

      const ensureGroup = async (key: string, group: string) => {
        try {
          await client.sendCommand([
            "XGROUP",
            "CREATE",
            key,
            group,
            "0",
            "MKSTREAM",
          ]);
        } catch (err: unknown) {
          const error = err as { message?: string };
          if (!error?.message?.includes("BUSYGROUP")) {
            console.error(
              `[Worker] Failed to create group ${group} on ${key}:`,
              err,
            );
            // If it's not a BUSYGROUP, we might have a real problem, but we'll try to proceed.
          }
        }
      };

      await ensureGroup(streamKey, groupName);
      await ensureGroup(dlqKey, groupName);

      const contextKey =
        workerType === "process"
          ? mediatorOptions.processingContextKey
          : mediatorOptions.insertContextKey;
      const contextRaw = (await client.sendCommand(["GET", contextKey])) as
        | string
        | null;
      const context = contextRaw ? JSON.parse(contextRaw) : null;

      if (init) {
        await init(context, { workerMetadata });
      }

      try {
        const processBatch = async (
          ids: string[],
          batch: TMessage[],
          currentStreamKey: string,
          isDlq: boolean,
        ) => {
          let lastErr: unknown;
          let success = false;
          let payloads: TFinishedPayload[] = [];

          for (let i = 0; i <= maxRetries; i++) {
            try {
              const res = await execute(context, batch, {
                retryCount: i,
                workerMetadata,
              });
              payloads = res ?? [];
              success = true;
              break;
            } catch (err) {
              lastErr = err;
            }
          }

          if (success) {
            const successCommands: string[][] = [["MULTI"]];
            for (const id of ids) {
              successCommands.push(["XACK", currentStreamKey, groupName, id]);
            }
            if (workerType === "process" && nextStreamKey) {
              for (const payloadItem of payloads) {
                successCommands.push([
                  "XADD",
                  nextStreamKey,
                  "*",
                  "data",
                  JSON.stringify(payloadItem),
                ]);
              }
              successCommands.push([
                "SET",
                mediatorOptions.persistedLastInsertMessageKey,
                JSON.stringify(payloads[payloads.length - 1]),
              ]);
            }
            successCommands.push(["EXEC"]);
            await client.pipelineCommands(successCommands);
            port.postMessage({
              type: WORKER_EVENTS.FINISHED,
              payload: payloads,
            });
          } else {
            const failCommands: string[][] = [["MULTI"]];
            for (const id of ids) {
              failCommands.push(["XACK", currentStreamKey, groupName, id]);
            }
            if (!isDlq) {
              for (const batchItem of batch) {
                failCommands.push([
                  "XADD",
                  dlqKey,
                  "*",
                  "data",
                  JSON.stringify(batchItem),
                  "error",
                  String(lastErr),
                ]);
              }
            }
            failCommands.push(["EXEC"]);
            await client.pipelineCommands(failCommands);
            port.postMessage({
              type: WORKER_EVENTS.INTERRUPTED,
              error: lastErr,
            });
          }
        };

        const drainPhase = async (currentStreamKey: string, isDlq: boolean) => {
          while (true) {
            const pending = (await client.sendCommand([
              "XPENDING",
              currentStreamKey,
              groupName,
              "IDLE",
              mediatorOptions.pendingMinDurationThreshold.toString(),
              "-",
              "+",
              _batchSize.toString(),
              // deno-lint-ignore no-explicit-any
            ])) as any[];

            const idsToClaim = pending.map((p) => p[0]);
            if (idsToClaim.length > 0) {
              await client.sendCommand([
                "XCLAIM",
                currentStreamKey,
                groupName,
                consumerName,
                mediatorOptions.pendingMinDurationThreshold.toString(),
                ...idsToClaim,
              ]);
            }

            const streams = (await client.sendCommand([
              "XREADGROUP",
              "GROUP",
              groupName,
              consumerName,
              "COUNT",
              _batchSize.toString(),
              "BLOCK",
              "1",
              "STREAMS",
              currentStreamKey,
              ">",
              // deno-lint-ignore no-explicit-any
            ])) as any[];

            if (!streams || streams.length === 0) break;

            const msgs = streams[0][1] as [string, string[]][];
            const batchIds = msgs.map(([id]) => id);
            const batchData = msgs.map(
              ([_, fields]) => JSON.parse(fields[1]) as TMessage,
            );
            await processBatch(batchIds, batchData, currentStreamKey, isDlq);
          }
        };

        // --- Phase 1: Drain DLQ ---
        await drainPhase(dlqKey, true);

        // --- Phase 2: Drain Pending and Unread Main Stream ---
        await drainPhase(streamKey, false);

        const getLag = async (
          client: RedisClient,
          stream: string,
          group: string,
        ): Promise<number> => {
          try {
            const groups = (await client.sendCommand([
              "XINFO",
              "GROUPS",
              stream,
              // deno-lint-ignore no-explicit-any
            ])) as any[];
            const groupInfo = groups.find((g) => {
              if (Array.isArray(g)) {
                const nameIdx = g.indexOf("name");
                return g[nameIdx + 1] === group;
              }
              return g.name === group;
            });
            if (!groupInfo) return 0;
            if (Array.isArray(groupInfo)) {
              const lagIdx = groupInfo.indexOf("lag");
              return lagIdx !== -1 ? Number(groupInfo[lagIdx + 1]) : 0;
            }
            return Number(groupInfo.lag ?? 0);
          } catch {
            return 0;
          }
        };

        // --- Phase 3: Continuous Processing ---
        let hasMore = true;
        do {
          const streams = (await client.sendCommand([
            "XREADGROUP",
            "GROUP",
            groupName,
            consumerName,
            "COUNT",
            _batchSize.toString(),
            "BLOCK",
            mediatorOptions.xreadBlockDuration.toString(),
            "STREAMS",
            streamKey,
            ">",
            // deno-lint-ignore no-explicit-any
          ])) as any[];

          if (streams && streams.length > 0) {
            const msgs = streams[0][1] as [string, string[]][];
            const batchIds = msgs.map(([id]) => id);
            const batchData = msgs.map(
              ([_, fields]) => JSON.parse(fields[1]) as TMessage,
            );
            await processBatch(batchIds, batchData, streamKey, false);
          }

          // Evaluate termination
          const lag = await getLag(client, streamKey, groupName);
          const producerKey =
            workerType === "process"
              ? mediatorOptions.persistedLastMessageKey
              : mediatorOptions.persistedLastInsertMessageKey;
          const producerExists = (await client.sendCommand([
            "EXISTS",
            producerKey,
          ])) as number;
          hasMore = lag > 0 || producerExists === 1;
          if (!hasMore) {
            console.log(
              `[Worker ${consumerName}] Loop termination reached. Lag: ${lag}, Producer exists: ${producerExists}`,
            );
          }
        } while (hasMore);

        // --- Post-Loop Cleanup ---
        if (workerType === "process") {
          await client.sendCommand([
            "DEL",
            mediatorOptions.persistedLastInsertMessageKey,
          ]);
        }
      } catch (err) {
        port.postMessage({ type: WORKER_EVENTS.INTERRUPTED, error: err });
      } finally {
        await teardown?.(context, { workerMetadata });
        port.postMessage({ type: WORKER_EVENTS.DONE });
        port.close();
        redis.close();
      }
    });
  }
}

let _instance: RedisQueueWorkersMediator<
  // deno-lint-ignore no-explicit-any
  any,
  // deno-lint-ignore no-explicit-any
  any,
  // deno-lint-ignore no-explicit-any
  any,
  // deno-lint-ignore no-explicit-any
  any,
  // deno-lint-ignore no-explicit-any
  any
> | null = null;

export function injectRedisQueueWorkersMediator<
  TProcessingContext = unknown,
  TMessage extends object = object,
  TProcessingFinishedPayload = unknown,
  TInsertContext = unknown,
  TInsertFinishedPayload = unknown,
>(
  client: RedisClient,
  redisConfig: RedisConnectionParams,
  options: RedisQueueWorkersMediatorOptions = {},
): RedisQueueWorkersMediator<
  TProcessingContext,
  TMessage,
  TProcessingFinishedPayload,
  TInsertContext,
  TInsertFinishedPayload
> {
  if (!_instance) {
    _instance = new RedisQueueWorkersMediator(client, redisConfig, options);
  }
  // deno-lint-ignore no-explicit-any
  return _instance as any;
}

export function injectRedisQueueWorkerExecutor<
  TContext = unknown,
  TMessage = unknown,
  TFinishedPayload = unknown,
>(): RedisQueueWorkerExecutor<TContext, TMessage, TFinishedPayload> {
  return new RedisQueueWorkerExecutor();
}
