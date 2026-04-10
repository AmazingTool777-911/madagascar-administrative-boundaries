---
trigger: model_decision
description: Use this when creating or modifying a TypeScript file that exports classes, methods, functions, interfaces, or types.
---

# JSDoc for exported TypeScript symbols

Use this when creating or modifying a TypeScript file that exports classes,
methods, functions, interfaces, or types.

---

Every exported class, method, function, interface, and type alias must have a
JSDoc block. Internal (non-exported) symbols do not require JSDoc.

## Class

Document what the class represents and its responsibility:

```ts
/**
 * Manages database connections and query execution.
 */
export class Database { ... }
```

## Constructor

Document each parameter when the constructor has arguments:

```ts
/**
 * @param url - Connection string for the database.
 * @param poolSize - Maximum number of concurrent connections.
 */
constructor(private url: string, private poolSize: number) {}
```

## Method and function

Document what it does, each parameter, and the return value. Omit `@returns`
only when the return type is `void` or `Promise<void>`:

```ts
/**
 * Executes a SQL query and returns the resulting rows.
 *
 * @param sql - The SQL string to execute.
 * @param params - Positional parameters to bind to the query.
 * @returns An array of rows matching the query.
 */
export function query(sql: string, params: unknown[]): Row[] { ... }
```

For async functions, document the resolved value, not the Promise:

```ts
/**
 * Fetches a user by their unique identifier.
 *
 * @param id - The user's UUID.
 * @returns The matching user, or `null` if not found.
 */
export async function fetchUser(id: string): Promise<User | null> { ... }
```

## Exceptions

Use `@throws` when the function throws under a known condition:

```ts
/**
 * Parses a raw config object into a validated Config instance.
 *
 * @param raw - Unvalidated configuration input.
 * @returns A validated Config instance.
 * @throws {ConfigError} If any required field is missing or invalid.
 */
export function parseConfig(raw: unknown): Config { ... }
```

## Interface

Document what the interface represents and the purpose of each property:

```ts
/**
 * Represents a database connection configuration.
 */
export interface DatabaseConfig {
  /** Connection string for the database. */
  url: string;
  /** Maximum number of concurrent connections. */
  poolSize: number;
  /** Whether to log all executed queries. */
  debug?: boolean;
}
```

## Type alias

Document what the type alias represents and when to use it:

```ts
/**
 * A UUID v4 string identifying a unique resource.
 */
export type ResourceId = string;

/**
 * The set of roles a user can be assigned to.
 */
export type UserRole = "admin" | "editor" | "viewer";
```

---

## Rules

- Write descriptions as full sentences ending with a period.
- Do not restate the type in the description — TypeScript already encodes it.
- Do not use `@param {type}` syntax — types come from the signature.
- Keep descriptions concise; avoid filler like "This function..." or "This
  method is used to...".
- If a parameter or return value can be `null` or `undefined`, say so explicitly
  in its description.
