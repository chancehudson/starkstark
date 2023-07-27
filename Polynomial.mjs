/**
 * Each polynomial contains an array of objects like
 * { coef, exp }
 **/

export function lagrange(xValues, field) {
  const polynomials = []
  const monomials = []
  // x -
  for (const v of xValues) {
    const poly = new Polynomial(field)
    // x - v
    poly.term(1n, 1n)
    poly.term(-1n*v, 0n)
    monomials.push(poly)
  }
}

export class Polynomial {
  constructor(field) {
    this.field = field
    this.terms = []
  }

  // test if one polynomial is equal to another
  equal(poly) {
    if (poly.terms.length !== this.terms.length) return false
    for (const term of this.terms) {
      if (!poly.terms.find(({ coef, exp }) => coef === term.coef && exp === term.exp)) return false
    }
    return true
  }

  copy() {
    const p = new Polynomial(this.field)
    p.terms = [...this.terms]
    return p
  }

  mul(poly) {
    // TODO: check that the fields for the polynomials match
    const newTerms = []
    for (const term of poly.terms) {
      newTerms.push(this._mulTerm(term))
    }
    this.terms = newTerms.flat()
    this._consolidate()
    return this
  }

  div(divisor) {
    // divisor must have degree less than `this`
    if (divisor.terms.length === 0) throw new Error('Divide by 0')
    const outTerms = []
    const divisorTerm = divisor.sortedTerms.pop()
    const interPoly = this.copy()
    while (interPoly.degree() >= divisor.degree()) {
      const largestTerm = interPoly.sortedTerms.pop()
      const coef = this.field.div(largestTerm.coef, divisorTerm.coef)
      const exp = largestTerm.exp - divisorTerm.exp
      outTerms.push({ coef, exp })
      const t = new Polynomial(this.field)
      t.terms = [{ coef, exp }]
      interPoly.sub(divisor.copy().mul(t))
    }
    const q = new Polynomial(this.field)
    q.terms = outTerms
    q._consolidate()
    return {
      q,
      r: interPoly
    }
  }

  // return terms in ascending order
  get sortedTerms() {
    return [...this.terms].sort((a,b) => a.exp > b.exp ? 1 : -1)
  }

  add(poly) {
    this.terms.push(...poly.terms)
    this._consolidate()
    return this
  }

  sub(poly) {
    return this.add(poly.copy().neg())
  }

  neg(poly) {
    this.terms = this._mulTerm({ coef: -1n, exp: 0n })
    this._consolidate()
    return this
  }

  _mulTerm({ coef, exp }) {
    const newTerms = []
    for (const term of this.terms) {
      newTerms.push({
        coef: this.field.mul(term.coef, coef),
        exp: exp + term.exp,
      })
    }
    return newTerms
  }

  _consolidate() {
    const expCoefMap = {}
    for (const t of this.terms) {
      if (!expCoefMap[t.exp]) {
        expCoefMap[t.exp] = 0n
      }
      expCoefMap[t.exp] = this.field.add(expCoefMap[t.exp], t.coef)
    }
    const terms = []
    for (const exp of Object.keys(expCoefMap)) {
      if (expCoefMap[exp] === 0n) continue
      terms.push({
        coef: expCoefMap[exp],
        exp: BigInt(exp),
      })
    }
    this.terms = terms
    return this
  }

  degree() {
    let degree = 0n
    for (const t of this.terms) {
      if (t.exp > degree) degree = t.exp
    }
    return degree
  }

  evaluate(val) {
    const degree = this.degree()
    const expCoefMap = {}
    for (const t of this.terms) {
      if (!expCoefMap[t.exp]) {
        expCoefMap[t.exp] = 0n
      }
      expCoefMap[t.exp] += t.coef
    }
    let out = 0n
    for (let x = degree; x >= 0; x--) {
      const coef = BigInt(expCoefMap[x.toString()] ?? 0n)
      if (x === degree) {
        out = coef
      } else {
        out = this.field.mod(out * val + coef)
      }
    }
    return out
  }

  term({ coef, exp }) {
    this.terms.push({
      coef: this.field.mod(coef),
      exp: this.field.mod(exp),
    })
    this._consolidate()
    return this
  }
}
