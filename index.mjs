import { ScalarField } from './ScalarField.mjs'
import { Polynomial } from './Polynomial.mjs'

const field = new ScalarField(3221225473n, 5n)

// g is a generator point for group of 1024 elements
const g = field.generator(1024n)
const G = Array(1024).fill().map((_, i) => field.exp(g, BigInt(i)))
// h is a generator point
const h = field.generator(8192n)

const H = Array(8192).fill().map((_, i) => field.exp(h, BigInt(i)))
const evalDomain = H.map(v => field.mul(v, field.g))

const traceElements = [1n, 3141592n]

while (traceElements.length < 1023) {
  const e1 = traceElements[traceElements.length - 1]
  const e2 = traceElements[traceElements.length - 2]
  traceElements.push(
    field.add(field.mul(e1, e1), field.mul(e2, e2))
  )
}

const poly = Polynomial.lagrange(G.slice(0, -1), traceElements, field)
const evaled = evalDomain.map(v => poly.evaluate(v))
console.log(evaled)

const numer0 = poly.copy().term({ coef: -1n, exp: 0n })
const denom0 = new Polynomial(field)
  .term({ coef: 1n, exp: 1n })
  .term({ coef: -1n, exp: 0n })

const { q: constraint0 } = numer0.div(denom0)
console.log(constraint0.evaluate(2718n))

const numer1 = poly.copy().term({ coef: -2338775057n, exp: 0n })
const denom1 = new Polynomial(field)
  .term({ coef: 1n, exp: 1n })
  .term({ coef: field.exp(g, 1022n), exp: 0n })
const { q: constraint1 } = numer1.div(denom1)

// 232961446
console.log(constraint1.evaluate(5772n))
