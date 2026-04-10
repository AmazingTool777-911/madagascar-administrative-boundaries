---
trigger: always_on
---

# Deno TypeScript — lint & format after codegen

## When this rule applies

After any code generation, file creation, or modification of TypeScript (.ts,
.tsx) files in this project.

## Required actions (run in order)

1. Run the Deno linter on the affected file(s): deno lint <file>
   - If lint errors are reported, fix them before proceeding.
   - Do not suppress lint rules with ignore comments unless there is a
     documented reason in the same block.

2. Run the Deno formatter on the affected file(s): deno fmt <file>
   - Always accept the formatter output without manual post-edits to avoid
     re-introducing style drift.

3. If the scope of changes spans multiple files, run project-wide checks: deno
   lint deno fmt

## Constraints

- Never skip linting or formatting, even for small edits or single-line changes.
- Never present code to the user as final until both deno lint and deno fmt pass
  with no errors.
- If a lint rule conflicts with a formatting requirement, report it to the user
  instead of silently ignoring it.
