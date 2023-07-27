// a finite field with cardinality p

export class ScalarField {
  constructor(p, g) {
    this.p = p
    this.g = g
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
}

