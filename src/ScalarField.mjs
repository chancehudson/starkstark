import randomf from 'randomf'

// a finite field with cardinality p

export class ScalarField {
  constructor(p, g) {
    this.p = p
    this.g = g
  }

  // TODO: make this safe
  sample(v) {
    return v % this.p
  }

  mod(v) {
    if (v < this.p && v >= 0) return v
    if (v < 0n) {
    // if we have v = -12 in _F = 9
    // we need to do 18 + v = 6
    // 18 = floor(abs(-12) / 9) + 1
      return (this.p * ((-1n * v) / this.p + 1n) + v) % this.p
    } else {
      return v % this.p
    }
  }

  add(v1, v2) {
    return this.mod(v1 + v2)
  }

  sub(v1, v2) {
    return this.mod(v1 - v2)
  }

  mul(v1, v2) {
    return this.mod(v1 * v2)
  }

  div(v1, v2) {
    return this.mul(v1, this.inv(v2))
  }

  neg(v) {
    return this.mul(-1n, v)
  }

  // calculate v^e using 2^k-ary method
  // https://en.wikipedia.org/wiki/Exponentiation_by_squaring
  exp(v, e) {
    if (e < 0n) throw new Error('negative exponent')
    if (e === 0n) return 1n
    let t = 1n
    while (e > 0n) {
      if (e % 2n !== 0n) t = this.mul(t, v)
      v = this.mul(v, v)
      // relying on floored division here
      e = e / 2n
    }
    return this.mod(t)
  }

  // get a generator point for a subgroup of `size` elements
  generator(size) {
    if (!this.g) throw new Error('No field generator value specified')
    if (size >= this.p) throw new Error('Subgroup must be smaller than field')
    if (((this.p -1n) % size) !== 0n) throw new Error('Subgroup must be a divisor of the field size')
    return this.exp(this.g, (this.p-1n) / size)
  }

  primitiveNthRoot(n) {
    return this.generator(n)
    let root = this.g
    let order = 1n << 119n
    while (order !== n) {
      root = this.exp(root, 2n)
      order = this.div(order, 2n)
    }
    return root
  }

  inv(d) {
    d = this.mod(d)
    if (d === 0n) throw new Error('divide by zero')
    let y = 0n
    let x = 1n
    let f = this.p
    while (d > 1n) {
      // q is quotient
      const q = d / f
      let t = f
      // f is remainder now,
      // process same as
      // Euclid's algo
      f = d % f
      d = t
      t = y
      // Update y and x
      y = x - q * y
      x = t
    }
    return this.mod(x)
  }

  random() {
    return randomf(this.p, false)
  }
}

