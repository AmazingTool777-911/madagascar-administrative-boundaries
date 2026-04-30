import { assertEquals } from "@std/assert";
import {
  resolveBoolean,
  resolveNumber,
  resolveOptionalNumber,
  resolveOptionalString,
  resolveString,
} from "./cli-args-env-resolvers.helper.ts";

Deno.test("cli-args-env-resolvers", async (t) => {
  const envKey = "TEST_ENV_KEY";

  await t.step("resolveString", async (st) => {
    await st.step("returns flag when provided", () => {
      assertEquals(
        resolveString("flag_value", envKey, "default"),
        "flag_value",
      );
    });

    await st.step("returns env when flag is undefined", () => {
      Deno.env.set(envKey, "env_value");
      assertEquals(resolveString(undefined, envKey, "default"), "env_value");
      Deno.env.delete(envKey);
    });

    await st.step("returns fallback when flag and env are undefined", () => {
      assertEquals(resolveString(undefined, envKey, "default"), "default");
    });
  });

  await t.step("resolveOptionalString", async (st) => {
    await st.step("returns flag when provided", () => {
      assertEquals(resolveOptionalString("flag_value", envKey), "flag_value");
    });

    await st.step("returns env when flag is undefined", () => {
      Deno.env.set(envKey, "env_value");
      assertEquals(resolveOptionalString(undefined, envKey), "env_value");
      Deno.env.delete(envKey);
    });

    await st.step("returns undefined when both are undefined", () => {
      assertEquals(resolveOptionalString(undefined, envKey), undefined);
    });
  });

  await t.step("resolveNumber", async (st) => {
    await st.step("returns flag when provided", () => {
      assertEquals(resolveNumber(10, envKey, 20), 10);
    });

    await st.step("returns env when flag is undefined", () => {
      Deno.env.set(envKey, "30");
      assertEquals(resolveNumber(undefined, envKey, 20), 30);
      Deno.env.delete(envKey);
    });

    await st.step("returns fallback when flag and env are undefined", () => {
      assertEquals(resolveNumber(undefined, envKey, 20), 20);
    });
  });

  await t.step("resolveOptionalNumber", async (st) => {
    await st.step("returns flag when provided", () => {
      assertEquals(resolveOptionalNumber(10, envKey), 10);
    });

    await st.step("returns env when flag is undefined", () => {
      Deno.env.set(envKey, "30");
      assertEquals(resolveOptionalNumber(undefined, envKey), 30);
      Deno.env.delete(envKey);
    });

    await st.step("returns undefined when both are undefined", () => {
      assertEquals(resolveOptionalNumber(undefined, envKey), undefined);
    });
  });

  await t.step("resolveBoolean", async (st) => {
    await st.step("returns flag when provided", () => {
      assertEquals(resolveBoolean(true, envKey), true);
      assertEquals(resolveBoolean(false, envKey), false);
    });

    await st.step("returns env when flag is undefined", () => {
      Deno.env.set(envKey, "true");
      assertEquals(resolveBoolean(undefined, envKey), true);

      Deno.env.set(envKey, "1");
      assertEquals(resolveBoolean(undefined, envKey), true);

      Deno.env.set(envKey, "false");
      assertEquals(resolveBoolean(undefined, envKey), false);

      Deno.env.delete(envKey);
    });

    await st.step("returns undefined when both are undefined", () => {
      assertEquals(resolveBoolean(undefined, envKey), undefined);
    });
  });
});
