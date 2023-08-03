import { Polynomial } from './Polynomial.mjs'
import { ScalarField } from './ScalarField.mjs'

export class MultiPolynomial {

  constructor(field) {
    this.expMap = new Map()
    this.field = field
  }

  isZero() {
    for (const [, coef] of this.expMap.entries()) {
      if (coef !== 0n) return false
    }
    return true
  }

  isEqual(poly) {
    if (poly.expMap.size() !== this.expMap.size()) return false
    for (const [exps, p1] of poly.expMap) {
      const p2 = this.expMap.get(key)
      if (p1 !== p2) return false
    }
    return true
  }

  copy() {
    const c = new MultiPolynomial()
    for (const [key, p] of this.entries()) {
      c.expMap.set(key, p)
    }
    return c
  }

  // add a multipolynomial
  add(poly) {
    for (const [exps, coef] of poly.expMap.entries()) {
      this.expMap.set(exps, this.field.add(this.expMap.get(exps) ?? 0n, coef))
    }
    return this
  }

  mul(poly) {
    const newExp = new Map()
    for (const [exp1, coef1] of poly.expMap.entries()) {
      const exponents1 = MultiPolynomial.expStringToVector(exp1)
      for (const [exp2, coef2] of this.expMap.entries()) {
        const exponents2 = MultiPolynomial.expStringToVector(exp2)
        const finalExponents = []
        for (let x = 0; x < exponents1.length; x++) {
          finalExponents.push(exponents1[x] + exponents2[x])
        }
        const expFinal = MultiPolynomial.expVectorToString(finalExponents)
        newExp.set(
          expFinal,
          this.field.add(newExp.get(expFinal) ?? 0n, this.field.mul(coef1, coef2))
        )
      }
    }
    this.expMap = newExp
    return this
  }

  evaluate(points) {
    let out = 0n
    for (const [_exps, coef] of this.expMap.entries()) {
      const exps = MultiPolynomial.expStringToVector(_exps)
      let inter = coef
      for (let x = 0; x < exps.length; x++) {
        if (exps[x] === 0n || !exps[x]) continue
        if (points.length < x) throw new Error(`No point defined for variable ${x}`)
        inter = this.field.mul(inter, this.field.exp(points[x], exps[x]))
      }
      out = this.field.add(out, inter)
    }
    return out
  }

  // exps should be a mapping of numbers to numbers
  // varialbe index to power
  term({ coef, exps }) {
    const vec = []
    for (let x = 0; x < MultiPolynomial.MAX_VARS; x++) {
      vec.push(exps[x] ?? 0n)
    }
    const exp = MultiPolynomial.expVectorToString(vec)
    this.expMap.set(
      exp,
      this.field.add(this.expMap.get(exp) ?? 0n, coef)
    )
    return this
  }

  static fromPoly(poly, varIndex) {
    if (varIndex >= this.MAX_VARS) throw new Error('Invalid variable index')
    const m = new this(poly.field)
    for (const { coef, exp } of poly.terms) {
      m.term({ coef, exps: { [varIndex]: exp }})
    }
    return m
  }

  static MAX_VARS = 1024

  static expStringToVector(s) {
    return s.split(',').map(v => BigInt(v))
  }

  static expVectorToString(vec) {
    if (vec.length > this.MAX_VARS) throw new Error('Too many exponent vectors')
    return [...vec, ...Array(this.MAX_VARS - vec.length).fill(0)].join(',')
  }
}
