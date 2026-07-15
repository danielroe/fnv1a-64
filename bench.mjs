import sindresorhusFnv1a from '@sindresorhus/fnv1a'
import fnvLite from 'fnv-lite'
import fnvPlus from 'fnv-plus'
import { bench, group, run } from 'mitata'
import murmurhash from 'murmurhash'
import xxhash from 'xxhashjs'
import { fnv1a64, fnv1a64Base36, fnv1a64Hex } from './src/index.ts'

const short = 'user:12345:profile'
const long = 'a'.repeat(1024)

for (const [label, input] of [['short key', short], ['1KB string', long]]) {
  group(label, () => {
    bench('fnv1a-64 (lanes)', () => fnv1a64(input))
    bench('fnv1a-64 (hex)', () => fnv1a64Hex(input))
    bench('fnv1a-64 (base36)', () => fnv1a64Base36(input))
    bench('@sindresorhus/fnv1a size:64', () => sindresorhusFnv1a(input, { size: 64 }))
    bench('fnv-plus fast1a64 (64-bit)', () => fnvPlus.fast1a64(input))
    bench('fnv-lite hex (128-bit)', () => fnvLite.hex(input))
    bench('xxhashjs h64', () => xxhash.h64(input, 0).toString(16))
    bench('murmurhash v3 (32-bit)', () => murmurhash.v3(input))
  })
}

run()
