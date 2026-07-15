import assert from 'node:assert'
import { fnv1a64, fnv1a64Base36, fnv1a64Hex } from 'fnv1a-64'

// eslint-disable-next-line no-console
console.log(fnv1a64Hex('hello world'), fnv1a64Base36('hello world'))

assert.strictEqual(fnv1a64Hex('hello world'), '779a65e7023cd2e7')
assert.deepStrictEqual(fnv1a64(''), { high: 0xCBF29CE4, low: 0x84222325 })
