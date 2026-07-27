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
  const len = str.length
  // Four 16-bit lanes, least-significant first: v0 is bits 0-15, v3 bits 48-63.
  // Splitting this fine keeps every intermediate a small integer -- the widest
  // is `65535 * 0x1B3 + 65535 << 8`, still under 2^31 -- so the whole loop stays
  // in V8's tagged-int fast path with no doubles and no `>>> 0` normalisation.
  // The lanes are only recombined into `high`/`low` on the way out.
  let i = 0
  let t0 = 0
  let v0 = 0x2325
  let t1 = 0
  let v1 = 0x8422
  let t2 = 0
  let v2 = 0x9CE4
  let t3 = 0
  let v3 = 0xCBF2

  while (i < len) {
    v0 ^= str.charCodeAt(i++)
    // Multiply each lane by the prime's low half, 0x1B3.
    t0 = v0 * 0x1B3
    t1 = v1 * 0x1B3
    t2 = v2 * 0x1B3
    t3 = v3 * 0x1B3
    // The prime is 0x1B3 + 2^40, and 2^40 is 2.5 lanes, so the 2^40 term shifts
    // v0 into v2 and v1 into v3, each by the remaining 8 bits.
    t2 += v0 << 8
    t3 += v1 << 8
    // Propagate the carries upward, truncating each lane back to 16 bits.
    t1 += t0 >>> 16
    v0 = t0 & 65535
    t2 += t1 >>> 16
    v1 = t1 & 65535
    v3 = (t3 + (t2 >>> 16)) & 65535
    v2 = t2 & 65535
  }

  // combine into high and low to keep the API shape
  return { high: ((v3 << 16) | v2) >>> 0, low: ((v1 << 16) | v0) >>> 0 }
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

const hexDigits = '0123456789abcdef'

/**
 * Every byte value rendered as its two hex digits, so a 32-bit lane formats in
 * 4 lookups instead of `toString(16)` plus a `padStart`. Leading zeros are
 * intrinsic to the table, which is what makes the padding free.
 */
const hexPairs: string[] = Array.from(
  { length: 256 },
  (_, i) => hexDigits.charAt(i >> 4) + hexDigits.charAt(i & 15),
)

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
  // @ts-expect-error -- every index is masked to a byte, so all eight reads are
  // in range; only the first needs asserting, as it types the whole `+` chain.
  const head: string = hexPairs[high >>> 24]
  return head
    + hexPairs[(high >>> 16) & 0xFF]
    + hexPairs[(high >>> 8) & 0xFF]
    + hexPairs[high & 0xFF]
    + hexPairs[low >>> 24]
    + hexPairs[(low >>> 16) & 0xFF]
    + hexPairs[(low >>> 8) & 0xFF]
    + hexPairs[low & 0xFF]
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
