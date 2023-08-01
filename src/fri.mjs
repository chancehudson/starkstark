import { MerkleTree } from './Tree.mjs'
import { createHash } from 'crypto'

export class FRI {
  constructor(config) {
    const {
      offset,
      omega, // should be a field element
      domainLength,
      field,
      expansionFactor,
      colinearityTestCount
    } = config
    Object.assign(this, {
      offset,
      omega,
      domainLength,
      field,
      expansionFactor,
      colinearityTestCount
    })
  }

  roundCount() {
    const codewordLength = this.domainLength
    const numRounds = 0
    while (codewordLength > this.expansionFactor && 4 * this.colinearityTestCount < codewordLength) {
      codewordLength /= 2
      numRounds++
    }
    return numRounds
  }

  evalDomain() {
    const domain = []
    for (let x = 0; x < this.domainLength; x++) {
      domain.push(
        this.field.mul(
          this.offset,
          this.field.exp(this.omega, BigInt(x))
        )
      )
    }
    return domain
  }

  // take a set of y values in a domain as
  // a codeword
  // proofStream is the interactive oracle
  prove(codeword, proofStream) {
    if (this.domainLength !== codeword.length) throw new Error('initial codeword length mismatch')
    const codewords = this.commit(codeword, proofStream)
    const topInidices = this.sampleIndices(
      proofStream.proverHash(),
      codewords[1].length,
      codewords[codewords.length - 1].length,
      this.colinearityTestCount
    )
    let indices = Array(topInidices.length).fill()
    for (let x = 0; x < codewords.length -1; x++) {
      indices = indices.map((index) => index % (codewords[index].length / 2n))
      this.query(codewords[x], codewords[x+1], indices, proofStream)
    }
  }

  commit(_codeword, proofStream) {
    const codewords = []
    let codeword = _codeword
    const f = this.field
    let omega = this.omega
    let offset = this.offset
    const twoInv = f.inv(2n)

    for (let x = 0; x < this.roundCount(); x++) {
      const root = MerkleTree.commit(codeword)
      proofStream.push(root)
      if (x === this.roundCount() - 1) break
      codewords.push(codeword)

      // now split the last codeword and fold into a set
      // of points from a polynomial of half the degree
      // of the previous codewords, similar to a FFT
      const alpha = f.sample(proofStream.proverHash())
      codeword = codeword.map((v, i) => {
        // two.inverse() * ( (one + alpha / (offset * (omega^i)) ) * codeword[i]
        const a1 = f.mul(twoInv, f.add(1n, f.div(alpha, f.mul(offset, f.exp(omega, i)))))
        const a2 = f.mul(a1, v)

        //  (one - alpha / (offset * (omega^i)) ) * codeword[len(codeword)//2 + i] ) for i in range(len(codeword)//2)]
        const b = f.mul(
          f.sub(1n, f.div(alpha, f.mul(offset, f.exp(omega, i)))),
          codeword[codeword.length >> 1 + i] // using >> for floored division by 2
        )
        return f.add(a2, b)
      })

      omega = f.exp(omega, 2n)
      offset = f.exp(offset, 2n)
    }
    proofStream.push(codeword)
    codewords.push(codeword)
    return codewords
  }

  query(currentCodeword, nextCodeword, indicesC, proofStream) {
    const indicesA = [...indicesC]
    const indicesB = indicesC.map(v => v + currentCodeword.length >> 1)

    for (let s = 0; s < this.colinearityTestCount; s++) {
      proofStream.push({
        ay: currentCodeword[indicesA[s]],
        by: currentCodeword[indicesB[s]],
        cy: nextCodeword[indicesC[s]]
      })
    }

    for (let s = 0; s < this.colinearityTestCount; s++) {
      proofStream.push(MerkleTree.open(indicesA[s], currentCodeword))
      proofStream.push(MerkleTree.open(indicesB[s], currentCodeword))
      proofStream.push(MerkleTree.open(indicesC[s], nextCodeword))
    }
    return [indicesA, indicesB].flat()
  }

  sampleIndex(bytes, size) {
    let acc = 0n
    for (const b of bytes) {
      acc = (acc << 8) ^ b
    }
    return acc % size
  }

  sampleIndices(seed, size, reducedSize, count) {
    if (count > 2*reducedSize) throw new Error('Not enough entropy')
    if (count > reducedSize) throw new Error('cannot sample more indices than available in last codeword')

    const indices = []
    const reducedIndices = []
    let counter = 0
    while (indices.length < count) {
      const hash = createHash('sha256')
      hash.update(seed.toString(16), 'hex')
      hash.update(BigInt(counter).toString(16), 'hex')
      const v = BigInt(`0x${hash.digest('hex')}`)
      const index = this.sampleIndex(v, size)
      const reducedIndex = index % reducedSize
      counter++
      if (reducedIndices.indexOf(reducedIndex) === -1) {
        indices.push(index)
        reducedIndices.push(index)
      }
    }
    return indices
  }

  verify(proofStream, polynomialValues) {
    let omega = this.omega
    let offset = this.offset

    const roots = []
    const alphas = []

    for (let x = 0; x < this.roundCount(); x++) {
      roots.push(proofStream.pull())
      alphas.push(this.field.sample(proofStream.verifierHash()))
    }

    let lastCodeword = proofStream.pull()
    if (roots[roots.length-1] !== MerkleTree.commit(lastCodeword)) {
      throw new Error('last codeword root mismatch')
    }

    const degree = Math.floor(lastCodeword.length / this.expansionFactor) - 1
    let lastOmega = omega
    let lastOffset = offset
    for (let x = 0; x < this.roundCount() - 1; x++) {
      lastOmega = this.field.exp(lastOmega, 2n)
      lastOffset = this.field.exp(lastOffset, 2n)
    }
    if (this.field.inv(lastOmega) !== this.field.exp(lastOmega, BigInt(lastCodeword.length - 1))) {
      throw new Error('omega order incorrect')
    }

    const lastDomain = lastCodeword.map((_, i) => this.field.mul(lastOffset, this.field.exp(lastOmega, BigInt(i))))
    const poly = Polynomial.lagrange(lastDomain, lastCodeword, this.field)

    // TODO: re-evaluate the polynomial to check lastCodeword consistency

    if (poly.degree() > BigInt(degree)) {
      throw new Error('last codeword does not correspond to a polynomial of low enough degree')
    }

    const topLevelIndices = this.sampleIndices(
      proofStream.verifierHash(),
      this.domainLength >> 1,
      this.domainLength >> (this.roundCount() - 1),
      this.colinearityTestCount
    )

    for (let x = 0; x < this.roundCount() - 1; x++) {
      const indicesC = topLevelIndices.map(index => index % BigInt((this.domainLength >> (x+1))))
      const indicesA = [...indicesC]
      const indicesB = indicesA.map((index) => index + BigInt(self.domainLength >> (x+1)))

      let aa = []
      let bb = []
      let cc = []
      // first test colinearity of points on curve
      for (let s = 0; s < this.colinearityTestCount; s++) {
        const { ay, by, cy } = proofStream.pull()
        aa.push(ay)
        bb.push(by)
        cc.push(cy)
        if (x === 0) {
          polynomialValues.push([aIndices[s], a])
        }

        const ax = this.field.mul(offset, this.field.exp(omega, indicesA[s]))
        const bx = this.field.mul(offset, this.field.exp(omega, indicesB[s]))
        const cx = alphas[x]

        // test colinearity of these points

      }

      // then verify merkle paths
      for (let s = 0; s < this.colinearityTestCount; s++) {
        const { path: path1 } = proofStream.pull()
        if (!MerkleTree.verify(roots[x], indicesA[s], path1, aa[s])) {
          throw new Error('merkle authentication path failure for aa')
        }
        const { path: path2 } = proofStream.pull()
        if (!MerkleTree.verify(roots[x], indicesB[s], path2, bb[s])) {
          throw new Error('merkle authentication path failure for bb')
        }
        const { path: path3 } = proofStream.pull()
        if (!MerkleTree.verify(roots[x+1], indicesC[s], path3, cc[s])) {
          throw new Error('merkle authentication path failure for cc')
        }
      }

      omega = this.field.exp(omega, 2n)
      offset = this.field.exp(offset, 2n)
    }

  }
}
