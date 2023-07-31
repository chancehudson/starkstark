/**
 * A simulated communication channel for
 * retrieving psuedo random values
 **/

import { createHash } from 'crypto'

export class Channel {
  constructor() {
    this.messages = []
    this.readIndex = 0
  }

  push(msg) {
    if (typeof msg !== 'bigint') throw new Error('msg must be bigint')
    this.messages.push(msg)
  }

  pull() {
    if (this.readIndex >= this.messages.length) throw new Error('No message to pull')
    return this.messages[this.readIndex++]
  }

  hash(to) {
    const hash = createHash('sha256')
    for (const m of this.messages.slice(0, to)) {
      hash.update(m.toString(16), 'hex')
    }
    return BigInt(`0x${hash.digest('hex')}`)
  }

  proverHash() {
    return this.hash()
  }

  verifierHash() {
    return this.hash(this.readIndex)
  }
}
