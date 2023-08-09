/**
 * A simulated communication channel for
 * retrieving psuedo random values
 **/

import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'

export class Channel {
  constructor() {
    this.messages = []
    this.readIndex = 0
  }

  push(msg) {
    this.messages.push(msg)
  }

  pull() {
    if (this.readIndex >= this.messages.length) throw new Error('No message to pull')
    return this.messages[this.readIndex++]
  }

  hash(to) {
    const hash = sha256.create()
    for (const m of this.messages.slice(0, to)) {
      hash.update(
        JSON.stringify(m, (_, v) => typeof v === 'bigint' ? v.toString() : v)
      )
    }
    return BigInt(`0x${bytesToHex(hash.digest())}`)
  }

  proverHash() {
    return this.hash()
  }

  verifierHash() {
    return this.hash(this.readIndex)
  }

  serialize() {
    return JSON.stringify(this.messages, (_, v) => typeof v === 'bigint' ? `0x${v.toString(16)}` : v)
  }

  static deserialize(proof) {
    const c = new this()
    c.messages = JSON.parse(proof, (_, v) => {
      if (typeof v === 'string' && /^0x[a-fA-F0-9]+$/.test(v)) return BigInt(v)
      return v
    })
    return c
  }
}
