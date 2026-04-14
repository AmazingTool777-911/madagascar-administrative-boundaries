/**
 * Prefixes a base string using the snake_case convention.
 *
 * @param prefix - The optional prefix string.
 * @param baseName - The base string.
 * @returns The formed snake_case prefixed string.
 */
export function prefixWithSnakeCase(
  prefix: string | null | undefined,
  baseName: string,
): string {
  const p = prefix?.trim();
  if (!p) return baseName;

  const snakePrefix = p
    .replace(/\W+/g, "_")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();

  return snakePrefix.endsWith("_")
    ? `${snakePrefix}${baseName}`
    : `${snakePrefix}_${baseName}`;
}

/**
 * Prefixes a base string using the camelCase convention.
 *
 * @param prefix - The optional prefix string.
 * @param baseName - The base string.
 * @returns The formed camelCase prefixed string.
 */
export function prefixWithCamelCase(
  prefix: string | null | undefined,
  baseName: string,
): string {
  const p = prefix?.trim();
  if (!p) return baseName;

  const parsed = p
    .replace(/\W+/g, "_")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();

  const parts = parsed.split("_").filter(Boolean);
  if (parts.length === 0) return baseName;

  const camelPrefix = parts.reduce((acc, part, index) => {
    if (index === 0) return part.toLowerCase();
    return acc + part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }, "");

  const camelBase = baseName.charAt(0).toUpperCase() + baseName.slice(1);
  return `${camelPrefix}${camelBase}`;
}
