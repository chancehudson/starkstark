import test from 'ava'
import { MultiPolynomial } from '../src/MultiPolynomial.mjs'
import { Polynomial } from '../src/Polynomial.mjs'
import { ScalarField } from '../src/ScalarField.mjs'

test('should evaluate a multipolynomial', t => {
  const f = new ScalarField(101n)

  // f(x) = 2 + 4x + x^2 + 5x^3
  const p1 = new Polynomial(f)
    .term({ coef: 1n, exp: 2n })
    .term({ coef: 4n, exp: 1n })
    .term({ coef: 2n, exp: 0n })
    .term({ coef: 5n, exp: 3n })


  const p2 = new Polynomial(f)
    .term({ coef: 9n, exp: 8n })

  const p3 = new Polynomial(f)
    .term({ coef: 2909n, exp: 29n })

  const m = new MultiPolynomial(f)
    // p1
    .term({ coef: 1n, exps: { 0: 2n }})
    .term({ coef: 4n, exps: { 0: 1n }})
    .term({ coef: 2n, exps: { 0: 0n }})
    .term({ coef: 5n, exps: { 0: 3n }})
    // p2
    .term({ coef: 9n, exps: { 1: 8n }})
    // p3
    .term({ coef: 2909n, exps: { 2: 29n }})

  for (let x = 0n; x < 101n; x++) {
    const out1 = f.add(p3.evaluate(3n*x), f.add(p1.evaluate(x), p2.evaluate(2n*x)))
    const out2 = m.evaluate([x, 2n*x, 3n*x])
    t.is(out1, out2)
  }
})

test('should add two multipolynomials', t => {
  const f = new ScalarField(101n)
  const p1 = new Polynomial(f)
    .term({ coef: 1n, exp: 2n })
    .term({ coef: 4n, exp: 1n })
    .term({ coef: 2n, exp: 0n })
    .term({ coef: 5n, exp: 3n })


  const p2 = new Polynomial(f)
    .term({ coef: 9n, exp: 8n })

  const m1 = new MultiPolynomial(f)
    // p1
    .term({ coef: 1n, exps: { 0: 2n }})
    .term({ coef: 4n, exps: { 0: 1n }})
    .term({ coef: 2n, exps: { 0: 0n }})
    .term({ coef: 5n, exps: { 0: 3n }})
  const m2 = new MultiPolynomial(f)
    // p2
    .term({ coef: 9n, exps: { 1: 8n }})

  m1.add(m2)

  for (let x = 0n; x < 101n; x++) {
    const out1 = f.add(p1.evaluate(x), p2.evaluate(2n*x))
    const out2 = m1.evaluate([x, 2n*x])
    t.is(out1, out2)
  }
})

test('should create multipolynomial from polynomial', t => {
  const f = new ScalarField(101n)
  const p = new Polynomial(f)
    .term({ coef: 1n, exp: 2n })
    .term({ coef: 4n, exp: 1n })
    .term({ coef: 2n, exp: 0n })
    .term({ coef: 5n, exp: 3n })
  const m0 = MultiPolynomial.fromPoly(p, 0)
  const m2 = MultiPolynomial.fromPoly(p, 2)

  for (let x = 0n; x < 101n; x++) {
    const out1 = p.evaluate(x)
    const out2 = m0.evaluate([x])
    const out3 = m2.evaluate([0n, 0n, x])
    t.is(out1, out2)
    t.is(out2, out3)
  }
})

test('should multiply two multipolynomials', t => {
  const f = new ScalarField(101n)
  // x: 0, y: 1
  const m1 = new MultiPolynomial(f)
    .term({ coef: 2n, exps: { 0: 3n }})
    .term({ coef: 4n, exps: { 0: 1n }})
    .term({ coef: 3n, exps: { 0: 0n }})
  const m2 = new MultiPolynomial(f)
    .term({ coef: 3n, exps: { 1: 2n }})
    .term({ coef: 1n, exps: { 1: 1n }})
    // dummy terms
    .term({ coef: 0n, exps: { 1: 1n }})

  m1.mul(m2)

  const m = new MultiPolynomial(f)
    .term({ coef: 6n, exps: { 0: 3n, 1: 2n }})
    .term({ coef: 12n, exps: { 0: 1n, 1: 2n }})
    .term({ coef: 9n, exps: { 0: 0n, 1: 2n }})
    .term({ coef: 2n, exps: { 0: 3n, 1: 1n }})
    .term({ coef: 4n, exps: { 0: 1n, 1: 1n }})
    .term({ coef: 3n, exps: { 0: 0n, 1: 1n }})
    // dummy terms
    .term({ coef: 0n, exps: { 0: 0n, 1: 1n }})
    .term({ coef: 0n, exps: { 0: 4n, 1: 1n }})

  for (let x = 0n; x < 101n; x++) {
    const out1 = m1.evaluate([x, 2n*x])
    const out2 = m.evaluate([x, 2n*x])
    t.is(out1, out2)
  }
})

test('should multiply two different degree multipolynomials', t => {
  const f = new ScalarField(101n)
  const m1 = new MultiPolynomial(f)
    .term({ coef: 2n, exps: { 1: 1n }})

  const m2 = new MultiPolynomial(f)
    .term({ coef: 4n, exps: { 2: 1n }})

  const m = new MultiPolynomial(f)
    .term({ coef: 8n, exps: { 1: 1n, 2: 1n }})
  t.true(m.isEqual(m1.copy().mul(m2)))
})

test('should negate a multipolynomial', t => {
  const f = new ScalarField(101n)
  const m = new MultiPolynomial(f)
    .term({ coef: 2n, exps: { 0: 3n }})
    .term({ coef: 4n, exps: { 0: 1n }})
    .term({ coef: 3n, exps: { 0: 0n }})

  const mNeg = new MultiPolynomial(f)
    .term({ coef: -2n, exps: { 0: 3n }})
    .term({ coef: -4n, exps: { 0: 1n }})
    .term({ coef: -3n, exps: { 0: 0n }})

  t.true(m.neg().isEqual(m))
})

test('should subtract two multipolynomials', t => {
  const f = new ScalarField(101n)
  const m1 = new MultiPolynomial(f)
    .term({ coef: 2n, exps: { 0: 3n }})
    .term({ coef: 4n, exps: { 0: 1n }})
    .term({ coef: 3n, exps: { 0: 0n }})
    .term({ coef: 9n, exps: { 1: 2n }})

  const m2 = new MultiPolynomial(f)
    .term({ coef: 3n, exps: { 0: 2n }})
    .term({ coef: 9n, exps: { 0: 1n }})
    .term({ coef: 2n, exps: { 1: 2n }})

  const expected = new MultiPolynomial(f)
    .term({ coef: 2n, exps: { 0: 3n }})
    .term({ coef: -3n, exps: { 0: 2n }})
    .term({ coef: -5n, exps: { 0: 1n }})
    .term({ coef: 3n, exps: { 0: 0n }})
    .term({ coef: 7n, exps: { 1: 2n }})

  t.true(m1.sub(m2).isEqual(expected))
})
