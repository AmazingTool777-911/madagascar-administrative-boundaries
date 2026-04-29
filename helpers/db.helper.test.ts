// deno-lint-ignore-file
import { assertEquals, assertThrows } from "@std/assert";
import { ensureIsPostgresDbTransactionCtx } from "./db.helper.ts";
import { DbType } from "@scope/consts/db";
import type {
  DbTransactionContext,
  PostgresTransactionContext,
} from "@scope/types/db";

Deno.test("ensureIsPostgresDbTransactionCtx", async (t) => {
  await t.step("returns false if context is undefined", () => {
    assertEquals(ensureIsPostgresDbTransactionCtx(), false);
  });

  await t.step("returns true if context is Postgres", () => {
    const ctx = {
      dbType: DbType.Postgres,
      tx: {},
    } as PostgresTransactionContext;
    assertEquals(ensureIsPostgresDbTransactionCtx(ctx), true);
  });

  await t.step("throws if context is not Postgres", () => {
    const ctx = { dbType: DbType.SQLite } as unknown as DbTransactionContext;
    assertThrows(
      () => ensureIsPostgresDbTransactionCtx(ctx),
      Error,
      `Transaction context type (${DbType.SQLite}) does not match database type (${DbType.Postgres})`,
    );
  });
});
