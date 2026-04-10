---
name: deno-testing
description: >
  Use this skill whenever writing, generating, or modifying tests in a Deno
  project. Triggers on any request to add tests, write unit tests, write
  integration tests, test a function, or improve test coverage. Always use
  this skill instead of reaching for third-party test frameworks like Jest,
  Vitest, or Mocha — Deno's native testing primitives are the required
  approach here.
---

# Deno native testing

## Core primitives

Always use Deno's built-in test API. Never import Jest, Vitest, Mocha, or any
other third-party test runner.

### `Deno.test` — top-level test case

```ts
Deno.test("descriptive name of what is being verified", () => {
  // assertions here
});
```

Use an options object when you need metadata:

```ts
Deno.test({
  name: "skipped until upstream bug is fixed",
  ignore: true,
  fn() {
    // ...
  },
});
```

Available options: `name`, `fn`, `ignore`, `only`, `sanitizeOps`,
`sanitizeResources`, `sanitizeExit`, `permissions`.

### `Deno.test` — async tests

```ts
Deno.test("fetches user data", async () => {
  const data = await fetchUser(1);
  assertEquals(data.id, 1);
});
```

### `t.step` — sub-steps inside a test

Use `t.step` to group related assertions within a single `Deno.test` without
creating separate top-level tests. This keeps related scenarios together and
produces readable nested output.

```ts
Deno.test("UserService", async (t) => {
  await t.step("create — returns new user with generated id", async () => {
    const user = await UserService.create({ name: "Ada" });
    assertExists(user.id);
    assertEquals(user.name, "Ada");
  });

  await t.step("find — returns null for unknown id", async () => {
    const user = await UserService.find("nonexistent");
    assertEquals(user, null);
  });
});
```

Always `await` each `t.step` call. Unawaited steps may silently not run.

---

## Assertions

Import from Deno's standard library. Do not install assertion packages.

```ts
import {
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertMatch,
  assertNotEquals,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "jsr:@std/assert";
```

| Assertion            | Use for                                |
| -------------------- | -------------------------------------- |
| `assertEquals`       | deep equality (objects, arrays)        |
| `assertStrictEquals` | reference / primitive identity (`===`) |
| `assertExists`       | value is not `null` or `undefined`     |
| `assertInstanceOf`   | class instance checks                  |
| `assertMatch`        | string matches a regex                 |
| `assertThrows`       | sync function throws                   |
| `assertRejects`      | async function rejects                 |

### Async error assertions

```ts
await assertRejects(
  async () => {
    await riskyOperation();
  },
  Error,
  "expected message fragment",
);
```

---

## File and naming conventions

- Place test files next to the module they test: `user.ts` → `user.test.ts`
- Alternatively, group under a `tests/` directory mirroring `src/` structure
- Only `*.test.ts` and `*.test.tsx` files are picked up by default

---

## Running tests

```sh
# All tests
deno test

# Specific file
deno test user.test.ts

# Watch mode during development
deno test --watch

# With coverage report
deno test --coverage=coverage/
deno coverage coverage/
```

Permissions required by the code under test must be passed explicitly:

```sh
deno test --allow-net --allow-read src/api.test.ts
```

---

## Patterns to follow

### Setup and teardown

Deno has no `beforeEach`/`afterEach`. Use explicit setup inside each test or
step, or use a helper factory:

```ts
function makeDb() {
  const db = new Database(":memory:");
  return {
    db,
    [Symbol.asyncDispose]: async () => db.close(),
  };
}

Deno.test("inserts a record", async () => {
  await using ctx = makeDb();
  ctx.db.exec("INSERT INTO ...");
  // ...
});
```

### Mocking with the standard library

```ts
import { spy, stub } from "jsr:@std/testing/mock";

Deno.test("calls save once", () => {
  const saveSpy = spy(repo, "save");
  service.process(item);
  assertEquals(saveSpy.calls.length, 1);
  saveSpy.restore();
});
```

### Fake time

```ts
import { FakeTime } from "jsr:@std/testing/time";

Deno.test("expires after TTL", () => {
  using time = new FakeTime();
  const cache = new Cache({ ttl: 1000 });
  cache.set("key", "value");
  time.tick(1001);
  assertEquals(cache.get("key"), undefined);
});
```

---

## What to avoid

- Do not use `describe` / `it` / `beforeEach` patterns — use `Deno.test` and
  `t.step` instead.
- Do not import from `npm:jest` or `npm:vitest`.
- Do not use `console.log` as a substitute for assertions.
- Do not write unawaited `t.step` calls.
