---
trigger: always_on
---

# Deno TypeScript — check, lint & format after codegen

## When this rule applies

After any code generation, file creation, or modification of TypeScript (.ts,
.tsx) files in this project.

## Required actions (run in order)

1. Run the Deno type checker on the affected file(s): `deno check <file>`
   - If type errors are reported, fix them before proceeding.
   - Type checking ensures the code is sound and follows interface contracts.

2. Run the Deno linter on the affected file(s): `deno lint <file>`
   - If lint errors are reported, fix them before proceeding.
   - Do not suppress lint rules with ignore comments unless there is a
     documented reason in the same block.

3. Run the Deno formatter on the affected file(s): `deno fmt <file>`
   - Always accept the formatter output without manual post-edits to avoid
     re-introducing style drift.

4. If the scope of changes spans multiple files, run project-wide checks: `deno check **/*.ts && deno lint && deno fmt`

## Constraints

- Never skip type checking, linting, or formatting, even for small edits or single-line changes.
- Never present code to the user as final until `deno check`, `deno lint`, and `deno fmt` pass with no errors.
- If a lint rule conflicts with a formatting requirement, report it to the user instead of silently ignoring it.
