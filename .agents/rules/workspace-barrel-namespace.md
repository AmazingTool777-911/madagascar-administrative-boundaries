---
trigger: model_decision
description: Apply this rule whenever creating or modifying a workspace package, its deno.json exports, or its root index.ts barrel file
---

# Workspace Barrel Imports with Namespaces

Always use barrel imports for workspace packages to keep the entry points clean
and predictable. Specialized internal modules within a package should be grouped
and exported via a namespace identifier for better discoverability and to avoid
name collisions.

## Rule

1. **Entry Point**: Every workspace package MUST contain an `index.ts` at its
   root.
2. **Deno Configuration**: The `deno.json` `exports` field MUST point to
   `./index.ts`.
3. **Namespace Export**: Inside `index.ts`, group each logical module into a
   namespace variable using the `import * as` syntax, and then export that
   variable.

## Example

### Package Structure

```text
helpers/
├── deno.json
├── index.ts
└── cli-args-env-resolvers.helper.ts
```

### helpers/deno.json

```json
{
  "name": "@scope/helpers",
  "exports": "./index.ts"
}
```

### helpers/index.ts

```ts
import * as CliArgsEnvResolvers from "./cli-args-env-resolvers.helper.ts";

export { CliArgsEnvResolvers };
```

### Usage

```ts
import { CliArgsEnvResolvers } from "@scope/helpers";

const dbPath = CliArgsEnvResolvers.resolveString(args.path, "DB_PATH", "./db");
```

## Rationale

- **Discoverability**: Grouped exports allow users of the package to see all
  related functions via IntelliSense completion after typing the namespace name.
- **Collision Avoidance**: Generic function names like `resolveString` are
  protected from colliding with other imports or local variables.
- **Maintainability**: Adding new modules only requires a single new line in
  `index.ts`.
