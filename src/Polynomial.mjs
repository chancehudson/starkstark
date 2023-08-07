/**
 * Each polynomial contains an array of objects like
 * { coef, exp }
 **/

export class Polynomial {
  constructor(field) {
    this.field = field
    this.terms = []
  }

  isZero() {
    return this.terms.length === 0
  }

  // test if one polynomial is equal to another
  isEqual(poly) {
    if (poly.terms.length !== this.terms.length) return false
    for (const term of this.terms) {
      if (!poly.terms.find(({ coef, exp }) => coef === term.coef && exp === term.exp)) return false
    }
    return true
  }

  copy() {
    const p = new Polynomial(this.field)
    p.terms = this.terms.map(t => ({...t}))
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

  mulScalar(v) {
    if (this.field.mod(v) === 0n) {
      this.terms = []
      return this
    }
    this.terms = this.terms.map(({ coef, exp }) => ({
      coef: this.field.mul(coef, v),
      exp,
    }))
    // TODO: do we need to consolidate here?
    return this
  }

  safediv(divisor) {
    const { q, r } = this.div(divisor)
    if (!r.isZero()) throw new Error('non-zero remainder')
    return q
  }

  div(divisor) {
    // divisor must have degree less than `this`
    if (divisor.terms.length === 0) throw new Error('Divide by 0')
    if (divisor.terms.length === 1 && divisor.terms[0].coef === 1n && divisor.terms[0].exp === 0n) return { q: this, r: new Polynomial(this.field) }
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

  get coefs() {
    const expMap = this.sortedTerms.reduce((acc, { coef, exp }) => ({
      ...acc,
      [exp]: coef,
    }), {})
    const coefs = []
    const d = BigInt(this.degree())
    for (let x = 0n; x < d+1n; x++) {
      coefs.push(expMap[x.toString()] ?? 0n)
    }
    return coefs
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
    const expCoefMap = new Map()
    for (const t of this.terms) {
      if (typeof t.exp !== 'bigint') throw new Error('invalid exp')
      if (typeof t.coef !== 'bigint') throw new Error('invalid coef')
      if (!expCoefMap.has(t.exp)) {
        expCoefMap.set(t.exp, 0n)
      }
      expCoefMap.set(
        t.exp,
        this.field.add(expCoefMap.get(t.exp), t.coef)
      )
    }
    const terms = []
    for (const exp of expCoefMap.keys()) {
      if (expCoefMap.get(exp) === 0n) continue
      terms.push({
        coef: expCoefMap.get(exp),
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

  // TODO: see if this there is an O(log) implementation
  exp(e) {
    if (e === 0n) {
      const p = new Polynomial(this.field)
        .term({ coef: 1n, exp: 0n })
      this.terms = p.terms
      return this
    }
    const t = new Polynomial(this.field)
      .term({ coef: 1n, exp: 0n })
    const a = Array(BigInt(e).toString(2).length).fill().map((_, i) => i).reverse()
    for (const i of a) {
      t.mul(t)
      if (((1n << BigInt(i)) & BigInt(e)) !== 0n) {
        t.mul(this)
      }
    }
    this.terms = t.terms
    return this
  }

  // compose `poly` into `this`
  compose(poly) {
    const out = new Polynomial(this.field)
    for (const term of this.terms) {
      const p = poly.copy()
        .exp(term.exp)
        .mulScalar(term.coef)
      out.add(p)
    }
    this.terms = out.terms
    return this
  }

  scale(val) {
    this.terms = this.terms.map(({ coef, exp }) => ({
      coef: this.field.mul(this.field.exp(val, exp), coef),
      exp,
    }))
    return this
  }

  // if a divide by zero occurs there is likely a duplicate x value
  static lagrange(xValues, yValues, field) {
    const xMap = xValues.reduce((acc, v, i) => ({
      ...acc,
      [v]: [...(acc[v.toString()] ?? []), i],
    }), {})
    for (const v of xValues) {
      if (xMap[v.toString()].length > 1) throw new Error(`Duplicate x value: ${v}`)
    }
    if (xValues.length !== yValues.length) throw new Error('Mismatched input lengths')

    const numerator = new Polynomial(field)
      .term({ coef: 1n, exp: 0n })
    // build the common numerator
    for (const v of xValues) {
      const poly = new Polynomial(field)
        .term({ coef: 1n, exp: 1n })
        .term({ coef: field.neg(v), exp: 0n })
      numerator.mul(poly)
    }

    const polynomials = []
    for (let j = 0; j < xValues.length; j++) {
      let denominator = 1n
      // build the denominator
      for (const [i, v] of Object.entries(xValues)) {
        if (+i === +j) continue
        denominator = field.mul(denominator, xValues[j] - xValues[+i])
      }
      // build a divisor for the common numerator
      // for the current j value
      const n = new Polynomial(field)
        .term({ coef: 1n, exp: 1n })
        .term({ coef: field.neg(xValues[j]), exp: 0n })
        .mulScalar(denominator)
      const { q: poly, r } = numerator.div(n)
      if (!r.isZero()) throw new Error('non-zero remainder in lagrange polynomial')
      polynomials.push(poly)
    }
    const final = new Polynomial(field)
    for (let j = 0; j < xValues.length; j++) {
      final.add(polynomials[j].mulScalar(yValues[j]))
    }
    return final
  }

  mulFFT(poly) {
    const elementCount = Math.max(Number(poly.degree()), Number(this.degree())) + 1
    const domainExp = BigInt(Math.ceil(Math.log2(elementCount*2)))
    const g = this.field.generator(2n**domainExp)
    const G = Array(Number(2n**domainExp)).fill().map((_,i) => this.field.exp(g, BigInt(i)))
    return Polynomial.mulFFT(this, poly, g, 2n**BigInt(domainExp), this.field)
  }

  static mulFFT(poly1, poly2, g, domainSize, field) {
    const G = Array(Number(domainSize)).fill().map((_,i) => field.exp(g, BigInt(i)))

    const p1Coefs = poly1.coefs
    if (p1Coefs.length < G.length) p1Coefs.push(...Array(G.length - p1Coefs.length).fill(0n))
    const p2Coefs = poly2.coefs
    if (p2Coefs.length < G.length) p2Coefs.push(...Array(G.length - p2Coefs.length).fill(0n))

    const x1 = this.evaluateFFT(p1Coefs, G, field)
    const x2 = this.evaluateFFT(p2Coefs, G, field)

    const x3 = Array(x1.length).fill().map((_, i) => {
      return field.mul(x1[i], x2[i])
    })

    const out = this.invFFT(x3, g, domainSize, field)
    const terms = out.map((coef, exp) => ({ coef, exp: BigInt(exp) }))
      .filter(({ coef }) => coef !== 0n)
    const p = new this(field)
    p.terms = terms
    return p

  }

  invFFT(vals, generator, domainSize) {
    return Polynomial.invFFT(vals, generator, domainSize, this.field)
  }

  static invFFT(vals, generator, domainSize, field) {
    if (vals.length === 1) return vals
    const lenInv = field.inv(BigInt(vals.length))
    const gInv = field.inv(generator)
    const G = Array(Number(domainSize)).fill().map((_,i) => field.exp(gInv, BigInt(i)))
    const out = this.evaluateFFT(vals, G, field)
    return out.map((v, i) => field.mul(v, lenInv))
  }

  evaluateBatch(xValues) {
    const out = []
    for (const v of xValues) {
      out.push(this.evaluate(v))
    }
    return out
  }

  // evaluate `this` at every point in domain
  // domain is an array of values
  evaluateFFT(domain) {
    const coefs = this.coefs
    if (coefs.length < domain.length) coefs.push(...Array(domain.length-coefs.length).fill(0n))
    return Polynomial.evaluateFFT(coefs, domain, this.field)
  }

  // technically this is a number theoretic transform,
  // a FFT applied in a finite field instead of the complex
  // numbers
  // we're evaluating a polynomial consisting of `vals` coefficients
  // at each point in `domain`. The output is the y value at each
  // x point in `domain`
  static evaluateFFT(vals, domain, field) {
    if (vals.length === 1) return vals
    const domainEven = domain.filter((v, i) => i % 2 === 0)
    const [left, right] = vals.reduce((acc, v, i) => {
      if (i % 2 === 0) {
        acc[0].push(v)
      } else {
        acc[1].push(v)
      }
      return acc
    }, [[], []])
    const leftOut = this.evaluateFFT(left, domainEven, field)
    const rightOut = this.evaluateFFT(right, domainEven, field)
    const out = Array(vals.length).fill(0)
    for (let i = 0; i < left.length; i++) {
      const x = leftOut[i]
      const y = rightOut[i]
      const yRoot = field.mul(y, domain[i])
      out[i] = field.add(x, yRoot)
      out[i+leftOut.length] = field.sub(x, yRoot)
    }
    return out
  }

  static testColinearity(points, field) {
    const domain = points.map(p => p[0])
    const values = points.map(p => p[1])

    const poly = Polynomial.lagrange(domain, values, field)
    return poly.degree() <= 1
  }

  static zeroifierDomainFFT(points, generator, domainSize, field) {
    if (points.length >= domainSize) throw new Error(`Too many points for domain of size ${domainSize}`)
    if (field.exp(generator, domainSize) !== 1n) throw new Error(`incorrect generator for domain of size ${domainSize}`)
    if (points.length === 0) return new Polynomial(field)
    if (points.length === 1) {
      return new Polynomial(field)
        .term({ coef: field.neg(points[0]), exp: 0n })
        .term({ coef: 1n, exp: 1n })
    }
    const half = points.length >> 1
    const left = this.zeroifierDomainFFT(points.slice(0, half), generator, domainSize, field)
    const right = this.zeroifierDomainFFT(points.slice(half), generator, domainSize, field)
    return this.mulFFT(left, right, generator, domainSize, field)
  }

  static zeroifierDomain(points, field) {
    const x = new Polynomial(field)
      .term({ coef: 1n, exp: 1n })
    const acc = new Polynomial(field)
      .term({ coef: 1n, exp: 0n })
    for (const p of points) {
      acc.mul(x.copy().term({ coef: field.neg(p), exp: 0n }))
    }
    return acc
  }

}
