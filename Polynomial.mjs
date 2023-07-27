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

  _consolidate() {
    const expCoefMap = {}
    for (const t of this.terms) {
      if (!expCoefMap[t.exp]) {
        expCoefMap[t.exp] = 0n
      }
      expCoefMap[t.exp] += t.coef
    }
    const terms = []
    for (const exp of Object.keys(expCoefMap)) {
      if (exp === 0n) continue
      terms.push({
        coef: expCoefMap[exp],
        exp: BigInt(exp),
      })
    }
    this.terms = terms
  }

  get sortedTerms() {
    return this.terms.sort((a, b) => a.exp > b.exp ? 1 : -1)
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

  term(coef, exp) {
    this.terms.push({
      coef: this.field.mod(coef),
      exp: this.field.mod(exp),
    })
    this._consolidate()
  }
}
