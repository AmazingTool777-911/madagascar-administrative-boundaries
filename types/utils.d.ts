/**
 * Represents a value that can be either synchronous or asynchronous.
 */
export type MaybePromise<T> = T | Promise<T>;
