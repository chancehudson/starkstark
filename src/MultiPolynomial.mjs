import { Polynomial } from './Polynomial.mjs'
import { ScalarField } from './ScalarField.mjs'

export class MultiPolynomial {

  constructor(field) {
    this.expMap = new Map()
    this.field = field
  }

  isEqual(poly) {
    if (poly.expMap.size !== this.expMap.size) return false
    for (const [exps, p1] of poly.expMap) {
      const p2 = this.expMap.get(exps)
      if (p1 !== p2) return false
    }
    return true
  }

  copy() {
    const c = new MultiPolynomial(this.field)
    for (const [key, p] of this.expMap.entries()) {
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
      if (!coef1) continue
      const exponents1 = MultiPolynomial.expStringToVector(exp1)
      for (const [exp2, coef2] of this.expMap.entries()) {
        if (!coef2) continue
        const exponents2 = MultiPolynomial.expStringToVector(exp2)
        const finalExponents = []
        for (let x = 0; x < Math.max(exponents1.length, exponents2.length); x++) {
          finalExponents.push((exponents1[x] ?? 0) + (exponents2[x] ?? 0))
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

  static constant(v, field) {
    return new MultiPolynomial(field)
      .term({ coef: v, exps: { 0: 0n }})
  }

  exp(pow) {
    if (Number(pow) === 0) {
      return MultiPolynomial.constant(1n, this.field)
    }
    const out = this.copy()
    for (let x = 1; x < Number(pow); x++) {
      out.mul(this)
    }
    this.expMap = out.expMap
    return this
  }

  neg() {
    for (const [exp, coef] of this.expMap.entries()) {
      this.expMap.set(exp, this.field.mul(-1n, coef))
    }
    return this
  }

  sub(poly) {
    this.add(poly.copy().neg())
    return this
  }

  evaluateSingle(point, expIndex) {
    const out = new MultiPolynomial(this.field)
    for (const [_exps, coef] of this.expMap.entries()) {
      const exps = MultiPolynomial.expStringToVector(_exps)
      if (exps.length <= expIndex) {
        // take term as is
        out.term({ coef, exps: exps.reduce((acc, val, i) => {
          return {
            ...acc,
            [i]: val ?? 0
          }
        }, {})})
        continue
      }
      const exp = exps[expIndex]
      const newCoef = this.field.mul(coef, this.field.exp(point, BigInt(exp)))
      out.term({ coef: newCoef, exps: exps.reduce((acc, val, i) => {
        if (i === expIndex) return acc
        return {
          ...acc,
          [i]: val
        }
      }, {})})
    }
    this.expMap = out.expMap
    return this
  }

  evaluatePartial(points) {
    const out = new MultiPolynomial(this.field)
    for (const [_exps, coef] of this.expMap.entries()) {
      const exps = MultiPolynomial.expStringToVector(_exps)
      let inter = coef
      for (let x = 0; x < exps.length; x++) {
        if (!exps[x]) continue
        if (points[x] === null) {
          // leave as is
        } else {
          // console.log(exps[x])
          inter = this.field.mul(inter, this.field.exp(points[x], BigInt(exps[x])))
          exps[x] = 0
        }
      }
      out.term({ coef: inter, exps: exps.reduce((acc, val, i) => {
        return {
          ...acc,
          [i]: val
        }
      }, {})})
    }
    this.expMap = out.expMap
    return this
  }

  evaluate(points) {
    let out = 0n
    for (const [_exps, coef] of this.expMap.entries()) {
      const exps = MultiPolynomial.expStringToVector(_exps)
      let inter = coef
      for (let x = 0; x < exps.length; x++) {
        if (!exps[x]) continue
        if (points.length < x) throw new Error(`No point defined for variable ${x}`)
        inter = this.field.mul(inter, this.field.exp(points[x], BigInt(exps[x])))
      }
      out = this.field.add(out, inter)
    }
    return out
  }

  evaluateSymbolic(polys) {
    const acc = new Polynomial(this.field)
    for (const [_exp, coef] of this.expMap.entries()) {
      const prod = new Polynomial(this.field)
        .term({ coef, exp: 0n })
      const exps = MultiPolynomial.expStringToVector(_exp)
      for (let x = 0; x < exps.length; x++) {
        if (!exps[x]) continue
        if (x >= polys.length) throw new Error(`No point defined for variable ${x}`)
        prod.mul(polys[x].copy().exp(exps[x]))
      }
      acc.add(prod)
    }
    return acc
  }

  // exps should be a mapping of numbers to numbers
  // varialbe index to power
  term({ coef, exps }) {
    const vec = []
    for (const key of Object.keys(exps)) {
        const i = Number(key)
        if (vec.length < i) {
          vec.push(...Array(i-vec.length).fill(0))
        }
        vec[i] = exps[key]
    }
    const exp = MultiPolynomial.expVectorToString(vec)
    const existing = this.expMap.get(exp)
    this.expMap.set(
      exp,
      existing ? this.field.add(existing, coef) : this.field.mod(coef)
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

  serialize() {
    // turn it into a u32 array
    function serializeBigint(v) {
      let _v = v
      const out = []
      while (_v > 0n) {
        out.push(Number(_v & ((1n << 32n) - 1n)))
        _v >>= 32n
      }
      return out
    }
    const out = new Map()
    for (const [_exp, coef] of this.expMap.entries()) {
      const exp = MultiPolynomial.expStringToVector(_exp)
      const numExp = exp.map(v => v ? Number(v) : 0)
      out.set(numExp, serializeBigint(coef))
    }
    return out
  }

  static expStringToVector(s) {
    const compressed = s.split('|')
    const out = []
    for (const [i, sc] of Object.entries(compressed)) {
      if (sc.length === 0) continue
      const split = sc.split(',').filter(v => v.length)
      if (split[0].length && split[0].startsWith('>')) {
        out.push(...Array(Number(split[0].slice(1))).fill(null))
        out.push(...split.slice(1))
      } else {
        out.push(...split)
      }
    }
    return out.flat().map(v => +v)
  }

  static expVectorToString(vec) {
    // trim trailing zeroes
    let lastIndex = vec.length
    for (let x = vec.length-1; x >= 0; --x) {
      if (!vec[x]) lastIndex = x
      else break
    }
    const realLength = Math.max(lastIndex, 1)
    let currentRunStart = 0
    const runs = []
    const shortenedVec = []
    for (let x = 0; x < realLength; x++) {
      if (vec[x]) {
        // run ends here
        const l = x - currentRunStart
        if (l > 2) {
          shortenedVec.push(`|>${l}`)
        } else if (l > 0) {
          shortenedVec.push(...Array(l).fill(0))
        }
        shortenedVec.push(vec[x])
        currentRunStart = x + 1
      }
    }
    return shortenedVec.join(',')
  }
}
