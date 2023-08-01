import { createHash } from 'crypto'

export class MerkleTree {

  // hash a pair of bigint values
  static _hash(args) {
    const [in1, in2] = args
    if (typeof in1 !== 'bigint') throw new Error('in1 must be bigint')
    if (typeof in2 !== 'bigint') throw new Error('in2 must be bigint')
    const hash = createHash('sha256')
    for (const _v of args) {
      let v = _v.toString(16)
      if (v.length % 2 === 1) v = `0${v}`
      hash.update(v, 'hex')
    }
    return BigInt(`0x${hash.digest('hex')}`)
  }

  static build(leaves) {
    const levels = [leaves]
    const levelCount = Math.ceil(Math.log2(leaves.length))
    for (let x = 0; x < levelCount; x++) {
      // iterate over each level
      levels.push([])
      if (levels[x].length % 2 === 1) levels[x].push(0n)
      for (let y = 0; y < levels[x].length; y += 2) {
        levels[x+1].push(
          MerkleTree._hash(levels[x].slice(y, y+2))
        )
      }
    }
    return levels
  }

  // calculate the root for an array of leaves
  static commit(leaves) {
    // check that length of leaves is a power of 2
    return this.build(leaves).pop()[0]
  }

  static open(_index, leaves) {
    const tree = this.build(leaves)
    let index = Number(_index)
    if (index > tree[0].length) throw new Error('Invalid index')
    const path = []
    for (let x = 0; x < tree.length-1; x++) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1
      const sibling = tree[x][siblingIndex]
      const node = tree[x][index]
      if (index % 2 === 0) {
        path.push([node, sibling])
      } else {
        path.push([sibling, node])
      }
      index >>= 1
    }
    return {
      path,
      root: tree.pop()[0]
    }
  }

  static verify(root, _index, path, leaf) {
    let index = Number(_index)
    let calculatedRoot = leaf
    for (const p of path) {
      const nodeIndex = index % 2 === 0 ? 0 : 1
      if (p[nodeIndex] !== calculatedRoot) throw new Error('Invalid intermediate root')
      calculatedRoot = MerkleTree._hash(p)
      index >>= 1
    }
    if (calculatedRoot !== root) throw new Error('Root mismatch')
    return true
  }

}
