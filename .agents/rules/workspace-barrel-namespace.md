---
trigger: model_decision
description: Apply this rule whenever creating or modifying a workspace package, its deno.json exports, or its root index.ts barrel file
---

# Workspace Barrel Files with Namespaces

Every workspace package must maintain a root `index.ts` that provides a
namespaced export of its internal modules. This ensuring consistent structure
and discoverability across the repository.

---

## Rule: Mandatory Barrel File

1. **Existence**: Every workspace package MUST contain an `index.ts` at its root.
2. **Deno Configuration**: The `deno.json` `exports` field MUST include the root entry point (e.g., `".": "./index.ts"`).
3. **Namespace Grouping**: Inside `index.ts`, group internal modules into namespace identifiers using the `import * as` syntax, and then export them.

## Rule: Preferred Import Style

**The existence of a namespaced barrel file does NOT change the import preference.**

- **Always prefer sub-path imports**: If a package exposes a specific module via a sub-path in its `deno.json` (e.g., `@scope/package/module`), use that sub-path directly.
- **Namespace fallback**: Use the namespaced root import (`import { Module } from "@scope/package"`) only if the package does not expose the desired module as a standalone sub-path.

---

## Example

### Package Structure
```text
adapters/
├── deno.json
├── index.ts
└── postgres/
    └── index.ts
```

### adapters/deno.json
```json
{
  "name": "@scope/adapters",
  "exports": {
    ".": "./index.ts",
    "./postgres": "./postgres/index.ts"
  }
}
```

### adapters/index.ts
```ts
import * as Postgres from "./postgres/index.ts";

export { Postgres };
```

### Preferred Usage (Sub-path)
```ts
// PREFERRED: Direct sub-path import
import { injectPostgresDbConnection } from "@scope/adapters/postgres";
```

### Alternative Usage (Namespace)
```ts
// Use namespaced root import only if necessary
import { Postgres } from "@scope/adapters";
Postgres.injectPostgresDbConnection();
```

---

## Rationale

- **Internal Organization**: The `index.ts` file serves as a map of the package's internal structure using namespaces, which helps avoid name collisions within the barrel itself.
- **Discoverability**: Grouped exports in `index.ts` allow for easy exploration of a package's capabilities via IntelliSense.
- **Performance & Clarity**: Preferring sub-path imports (as defined in `deno.json`) ensures that only the necessary code is loaded and makes dependencies more explicit.
