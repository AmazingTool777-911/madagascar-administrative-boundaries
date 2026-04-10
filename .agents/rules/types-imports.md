---
trigger: always_on
---

# Type-only imports

Use this when writing or modifying any TypeScript import statement that includes
types, interfaces, or type aliases.

---

Always use the `type` keyword for TypeScript-only imports so the compiler and
bundler can safely erase them at runtime.

## All imports are types

Use the top-level `import type` form when every named import is a type:

```ts
import type { MaybePromise } from "./utils.d.ts";
import type { User, UserRole } from "./models.ts";
```

## Mixed imports — types and values together

When an import statement contains both runtime values and types, keep them in a
single import and prefix each type with `type`:

```ts
import { type MaybePromise, variable } from "./utils.d.ts";
import { injectLogger, type LogLevel } from "./logger.ts";
```

Do not split them into two separate import statements for the same module.

---

## Rules

- Never import a type without the `type` keyword, whether at the top level or
  inline.
- Never write `import type` and a plain `import` from the same module — merge
  them into one import using inline `type` per symbol.
- Interfaces, type aliases, and `enum` used only as a type must all use the
  `type` keyword.
- Do not apply `type` to imported values, functions, classes, or constants —
  only to symbols that exist exclusively in the type system.
