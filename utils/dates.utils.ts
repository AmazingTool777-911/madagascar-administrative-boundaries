/**
 * Formats a duration given in milliseconds as a human-readable string.
 *
 * Upper time units are only included when the value exceeds their threshold:
 * - Seconds only: `30s`
 * - Minutes and seconds: `1min 10s`
 * - Hours, minutes, and seconds: `1h 30min 06s`
 *
 * Minutes and seconds are zero-padded to two digits when a higher unit is
 * present (e.g. `06s`, `05min`).
 *
 * @param ms - The duration in milliseconds.
 * @returns A human-readable duration string.
 */
export function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (hours > 0 || minutes > 0) {
    parts.push(
      hours > 0 ? `${String(minutes).padStart(2, "0")} m` : `${minutes} min`,
    );
  }

  parts.push(
    (hours > 0 || minutes > 0)
      ? `${String(seconds).padStart(2, "0")}s`
      : `${seconds}s`,
  );

  return parts.join(" ");
}
