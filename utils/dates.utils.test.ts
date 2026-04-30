import { assertEquals } from "@std/assert";
import { formatDuration } from "./dates.utils.ts";

Deno.test("formatDuration", async (t) => {
  await t.step("formats seconds only", () => {
    assertEquals(formatDuration(30000), "30s");
  });

  await t.step("formats minutes and seconds", () => {
    assertEquals(formatDuration(70000), "1 min 10s");
  });

  await t.step("formats hours, minutes, and seconds", () => {
    assertEquals(formatDuration(5406000), "1h 30 m 06s");
  });

  await t.step("pads seconds and minutes properly", () => {
    assertEquals(formatDuration(65000), "1 min 05s");
    assertEquals(formatDuration(3905000), "1h 05 m 05s");
  });
});
