/**
 * Resolves a string value from a CLI flag first, falling back to an
 * environment variable, and finally to a provided default.
 *
 * @param flag - The value supplied via the CLI flag (may be undefined).
 * @param envKey - The name of the environment variable to fall back to.
 * @param fallback - The default value when neither source provides one.
 * @returns The resolved string value.
 */
export function resolveString(
  flag: string | undefined,
  envKey: string,
  fallback: string,
): string {
  return flag ?? Deno.env.get(envKey) ?? fallback;
}

/**
 * Resolves an optional string value from a CLI flag first, falling back to an
 * environment variable.
 *
 * @param flag - The value supplied via the CLI flag (may be undefined).
 * @param envKey - The name of the environment variable to fall back to.
 * @returns The resolved string value, or `undefined` when neither source provides one.
 */
export function resolveOptionalString(
  flag: string | undefined,
  envKey: string,
): string | undefined {
  return flag ?? Deno.env.get(envKey);
}

/**
 * Resolves a numeric value from a CLI flag first, falling back to an
 * environment variable, and finally to a provided default.
 *
 * @param flag - The value supplied via the CLI flag (may be undefined).
 * @param envKey - The name of the environment variable to fall back to.
 * @param fallback - The default numeric value when neither source provides one.
 * @returns The resolved numeric value.
 */
export function resolveNumber(
  flag: number | undefined,
  envKey: string,
  fallback: number,
): number {
  const raw = Deno.env.get(envKey);
  return flag ?? (raw !== undefined ? Number(raw) : fallback);
}

/**
 * Resolves an optional numeric value from a CLI flag first, falling back to an
 * environment variable.
 *
 * @param flag - The value supplied via the CLI flag (may be undefined).
 * @param envKey - The name of the environment variable to fall back to.
 * @returns The resolved numeric value, or `undefined` when neither source provides one.
 */
export function resolveOptionalNumber(
  flag: number | undefined,
  envKey: string,
): number | undefined {
  const raw = Deno.env.get(envKey);
  return flag ?? (raw !== undefined ? Number(raw) : undefined);
}

/**
 * Resolves a boolean value from a CLI flag first, falling back to an
 * environment variable.
 *
 * @param flag - The value supplied via the CLI flag (may be undefined).
 * @param envKey - The name of the environment variable to fall back to.
 * @returns The resolved boolean value, or `undefined` when neither source provides one.
 */
export function resolveBoolean(
  flag: boolean | undefined,
  envKey: string,
): boolean | undefined {
  if (flag !== undefined) return flag;
  const raw = Deno.env.get(envKey);
  if (raw === undefined) return undefined;
  return raw.toLowerCase() === "true" || raw === "1";
}
