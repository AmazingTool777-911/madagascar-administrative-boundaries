---
trigger: model_decision
description: Use this when creating or modifying a TypeScript file that exports a class.
---

# Singleton pattern for exported classes

Use this when creating or modifying a TypeScript file that exports a class.

---

When a TypeScript file exports a class, always apply the singleton pattern in
that same file:

1. Declare a module-level variable initialized to `null` that will hold the
   single instance of the class:
   ```ts
   let _instance: ClassName | null = null;
   ```

2. Export a getter function named `inject` suffixed with the class name in
   camelCase — e.g. `injectClassName`. Its signature must mirror the class
   constructor exactly:
   - If the constructor takes no arguments, the function takes none.
   - If the constructor takes arguments, the function takes the same parameters
     with the same types.

   It initializes `_instance` on first call, then returns the cached instance on
   every subsequent call:
   ```ts
   export function injectClassName(...args): ClassName {
     if (!_instance) _instance = new ClassName(...args);
     return _instance;
   }
   ```

3. The class itself must still be exported normally.
4. Never instantiate the class outside of the inject function.
5. Never reset or reassign `_instance` outside of tests.

---

## Examples

No constructor args:

```ts
// logger.ts
export class Logger {
  log(msg: string) {
    console.log(msg);
  }
}

let _instance: Logger | null = null;

export function injectLogger(): Logger {
  if (!_instance) _instance = new Logger();
  return _instance;
}
```

With constructor args:

```ts
// database.ts
export class Database {
  constructor(private url: string, private poolSize: number) {}
  query(sql: string) {/* ... */}
}

let _instance: Database | null = null;

export function injectDatabase(url: string, poolSize: number): Database {
  if (!_instance) _instance = new Database(url, poolSize);
  return _instance;
}
```

Consuming the singletons:

```ts
// app.ts
import { injectDatabase } from "./database.ts";
import { injectLogger } from "./logger.ts";

const db = injectDatabase("postgres://localhost/mydb", 5);
const logger = injectLogger();
```
