---
trigger: model_decision
description: Use this when writing or modifying any TypeScript import statement that references a workspace module from within this Deno workspace.
---

# Workspace imports

Use this when writing or modifying any TypeScript import statement that
references a module from within this Deno workspace.

---

When the source module belongs to a workspace package, always import it using
its `@scope/name` specifier — never with a relative path that crosses package
boundaries.

## Identifying a workspace module

A module is a workspace module if its package is listed in the root `deno.json`
`workspaces` field. Before writing an import, check the root `deno.json` to
confirm whether the target package is a workspace member.

```jsonc
// root deno.json
{
  "workspaces": ["packages/logger", "packages/database", "packages/utils"]
}
```

## Finding the correct entry point

Before importing, read the target package's own `deno.json` and inspect its
`exports` field to find the valid entry points:

```jsonc
// packages/logger/deno.json
{
  "name": "@myapp/logger",
  "exports": {
    ".": "./mod.ts",
    "./formatters": "./src/formatters.ts"
  }
}
```

Only import from paths that are explicitly listed as keys in `exports`. Never
import from an internal file that is not exposed through `exports`.

## Import syntax

Use the `@scope/name` specifier with the exact export key. When a package
exposes specific modules via sub-entries, always prefer importing from the
subpath rather than the root entry point.

```ts
// named sub-entry "./formatters" (PREFERRED)
import { jsonFormatter } from "@myapp/logger/formatters";

// default entry "." (use only if no subpath is available)
import { injectLogger } from "@myapp/logger";
```

Never import across package boundaries using relative paths:

```ts
// wrong
import { injectLogger } from "../../packages/logger/mod.ts";
import { injectLogger } from "../logger/src/index.ts";
```

---

## Rules

- Always check the root `deno.json` `workspaces` field before deciding whether a
  module is a workspace member.
- Always read the target package's `deno.json` `exports` field to determine
  which entries are valid before writing the import.
- Whenever a subpath export is exposed (e.g.
  `"./workers": "./workers.consts.ts"`), strongly prefer importing directly from
  it over the root package namespace.
- Never import from a file path inside a workspace package that is not
  explicitly listed in its `exports` field.
- Never use relative paths to import from a different workspace package.
- Relative imports are only acceptable within the same package.
