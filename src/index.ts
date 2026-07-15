/**
 * The two 32-bit lanes of a 64-bit FNV-1a hash.
 *
 * `high` is the most-significant 32 bits, `low` the least-significant. Both are
 * unsigned integers in the range `0` to `2^32 - 1`.
 */
export interface Fnv1a64Lanes {
  high: number
  low: number
}

/**
 * Compute the 64-bit FNV-1a hash of a string as two 32-bit lanes.
 *
 * This is the fast core: no BigInt, no allocations, plain `Math.imul`-free
 * 32-bit arithmetic. Prefer {@link fnv1a64Hex} or {@link fnv1a64Base36} for a
 * usable key; use this directly only when you want to avoid string formatting.
 *
 * The hash is computed over UTF-16 code units (`str.charCodeAt(i)`), not UTF-8
 * bytes. For ASCII input this matches a canonical FNV-1a-64; for non-ASCII it
 * does not. See the README for details.
 *
 * @param str - The string to hash.
 * @returns The `{ high, low }` 32-bit lanes of the 64-bit hash.
 */
export function fnv1a64(str: string): Fnv1a64Lanes {
  let low = 0x84222325
  let high = 0xCBF29CE4
  for (let i = 0; i < str.length; i++) {
    low ^= str.charCodeAt(i)
    const lowByLow = (low & 0xFFFF) * 0x1B3
    const highOfLow = (low >>> 16) * 0x1B3
    const highByHigh = (high & 0xFFFF) * 0x1B3 + ((high >>> 16) * 0x1B3 << 16)
    const carry = (lowByLow >>> 16) + highOfLow
    // The 64-bit prime 0x100000001B3's 2^40 bit folds `low * 2^8` into the high lane.
    high = (highByHigh + (carry >>> 16) + low * 0x100) >>> 0
    low = ((lowByLow & 0xFFFF) | ((carry & 0xFFFF) << 16)) >>> 0
  }
  return { high: high >>> 0, low: low >>> 0 }
}

/**
 * Compute the 64-bit FNV-1a hash of a string as a `bigint`.
 *
 * Ergonomic and comparable, at the cost of composing the two lanes into a
 * `bigint`. For a compact string key, prefer {@link fnv1a64Base36}.
 *
 * @param str - The string to hash.
 * @returns The 64-bit hash as an unsigned `bigint`.
 */
export function fnv1a64BigInt(str: string): bigint {
  const { high, low } = fnv1a64(str)
  return (BigInt(high) << 32n) | BigInt(low)
}

/**
 * Compute the 64-bit FNV-1a hash of a string as a 16-character zero-padded
 * lowercase hex string.
 *
 * The output is always exactly 16 characters, so equal-length comparison and
 * fixed-width storage are safe.
 *
 * @param str - The string to hash.
 * @returns A 16-character hex string.
 */
export function fnv1a64Hex(str: string): string {
  const { high, low } = fnv1a64(str)
  return high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0')
}

/**
 * Compute the 64-bit FNV-1a hash of a string as a base36 string.
 *
 * This is the shortest textual form (up to 13 characters) and is ideal for
 * cache keys. The length varies with the value; it is not zero-padded. Equal
 * inputs always produce identical strings.
 *
 * @param str - The string to hash.
 * @returns A base36 string of the 64-bit hash.
 */
export function fnv1a64Base36(str: string): string {
  return fnv1a64BigInt(str).toString(36)
}
