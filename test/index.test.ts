import { describe, expect, it } from 'vitest'
import { fnv1a64, fnv1a64Base36, fnv1a64BigInt, fnv1a64Hex } from '../src'

function reference(str: string): { high: number, low: number, value: bigint } {
  let h = 0xCBF29CE484222325n
  const mask = (1n << 64n) - 1n
  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i))
    h = (h * 0x100000001B3n) & mask
  }
  return { high: Number(h >> 32n), low: Number(h & 0xFFFFFFFFn), value: h }
}

const cases = ['', 'a', 'abc', 'hello world', 'x'.repeat(200)]

describe('fnv1a64', () => {
  it('matches a bigint reference bit-for-bit', () => {
    for (const input of cases) {
      const ref = reference(input)
      const { high, low } = fnv1a64(input)
      expect({ high, low }, `lanes for ${JSON.stringify(input)}`).toEqual({
        high: ref.high,
        low: ref.low,
      })
    }
  })

  it('returns the offset basis for the empty string', () => {
    expect(fnv1a64('')).toEqual({ high: 0xCBF29CE4, low: 0x84222325 })
  })

  it('returns unsigned lanes', () => {
    for (const input of cases) {
      const { high, low } = fnv1a64(input)
      expect(high).toBeGreaterThanOrEqual(0)
      expect(low).toBeGreaterThanOrEqual(0)
      expect(high).toBeLessThanOrEqual(0xFFFFFFFF)
      expect(low).toBeLessThanOrEqual(0xFFFFFFFF)
    }
  })

  it('is stable across calls', () => {
    for (const input of cases) {
      expect(fnv1a64(input)).toEqual(fnv1a64(input))
    }
  })
})

describe('fnv1a64BigInt', () => {
  it('matches a bigint reference', () => {
    for (const input of cases) {
      expect(fnv1a64BigInt(input)).toBe(reference(input).value)
    }
  })
})

describe('fnv1a64Hex', () => {
  it('is 16 zero-padded characters', () => {
    for (const input of cases) {
      const hex = fnv1a64Hex(input)
      expect(hex).toHaveLength(16)
      expect(hex).toMatch(/^[0-9a-f]{16}$/)
      expect(BigInt(`0x${hex}`)).toBe(reference(input).value)
    }
  })

  it('matches known snapshots', () => {
    expect(fnv1a64Hex('')).toBe('cbf29ce484222325')
    expect(fnv1a64Hex('a')).toBe('af63dc4c8601ec8c')
    expect(fnv1a64Hex('hello world')).toBe('779a65e7023cd2e7')
  })
})

describe('fnv1a64Base36', () => {
  it('round-trips to the bigint value', () => {
    for (const input of cases) {
      expect(parseBase36(fnv1a64Base36(input))).toBe(reference(input).value)
    }
  })

  it('is stable and deterministic', () => {
    expect(fnv1a64Base36('abc')).toBe(fnv1a64Base36('abc'))
  })
})

describe('non-ascii behaviour', () => {
  it('hashes utf-16 code units, not utf-8 bytes', () => {
    for (const input of ['café', '日本語', '\u{1F600}emoji']) {
      const ref = reference(input)
      expect(fnv1a64(input)).toEqual({ high: ref.high, low: ref.low })
    }
  })
})

describe('collision smoke test', () => {
  it('has no collisions across 50k realistic keys', () => {
    const seen = new Set<string>()
    const prefixes = ['user', 'session', 'cache', 'route', 'asset', 'chunk', 'node', 'query']
    let count = 0
    for (let i = 0; i < 50_000; i++) {
      const key = `${prefixes[i % prefixes.length]}:${i}:${(i * 2654435761 >>> 0).toString(36)}`
      seen.add(fnv1a64Hex(key))
      count++
    }
    expect(seen.size).toBe(count)
  })
})

function parseBase36(value: string): bigint {
  let result = 0n
  for (const char of value) {
    result = result * 36n + BigInt(Number.parseInt(char, 36))
  }
  return result
}
