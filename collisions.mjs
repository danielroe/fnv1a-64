/* eslint-disable no-console */
import process from 'node:process'
import sindresorhusFnv1a from '@sindresorhus/fnv1a'
import fnvLite from 'fnv-lite'
import fnvPlus from 'fnv-plus'
import murmurhash from 'murmurhash'
import xxhash from 'xxhashjs'
import { fnv1a64Hex } from './src/index.ts'

const N = Number(process.argv[2] ?? 1_000_000)

const prefixes = ['user', 'session', 'cache', 'route', 'asset', 'chunk', 'node', 'query']
function key(i) {
  return `${prefixes[i % prefixes.length]}:${i}:${((i * 2654435761) >>> 0).toString(36)}`
}

const hashers = {
  'fnv1a-64': i => fnv1a64Hex(key(i)),
  '@sindresorhus/fnv1a size:64': i => sindresorhusFnv1a(key(i), { size: 64 }).toString(),
  'fnv-plus fast1a64 (64-bit)': i => fnvPlus.fast1a64(key(i)),
  'fnv-lite hex (128-bit)': i => fnvLite.hex(key(i)),
  'xxhashjs h64': i => xxhash.h64(key(i), 0).toString(16),
  'murmurhash v3 (32-bit)': i => String(murmurhash.v3(key(i))),
}

console.log(`Hashing ${N.toLocaleString()} distinct realistic keys\n`)
console.log('hasher'.padEnd(32), 'collisions')
console.log('-'.repeat(46))

for (const [name, fn] of Object.entries(hashers)) {
  const seen = new Set()
  let collisions = 0
  for (let i = 0; i < N; i++) {
    const h = fn(i)
    if (seen.has(h)) {
      collisions++
    }
    else {
      seen.add(h)
    }
  }
  console.log(name.padEnd(32), collisions.toLocaleString())
}
