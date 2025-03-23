/**
 * src/utils/generateDelimiter.ts
 *
 * Generates a unique delimiter string used to mark the end of a command’s output.
 * We typically append and parse it in BashWebClient / BashProcessManager.
 */

export function generateDelimiter(): string {
  // For instance, include a timestamp + random suffix to minimize collisions.
  const time = Date.now();
  const random = Math.random().toString(16).slice(2);
  return `__END_OF_CMD__${time}__${random}__`;
}
