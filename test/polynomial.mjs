import test from 'ava'
import { ScalarField } from '../ScalarField.mjs'
import { Polynomial } from '../Polynomial.mjs'

test('should evaluate polynomial', t => {
  const f = new ScalarField(101n)
  const p = new Polynomial(f)

  p.term({ coef: 1n, exp: 2n })
  p.term({ coef: 4n, exp: 1n })
  p.term({ coef: 2n, exp: 0n })
  p.term({ coef: 5n, exp: 3n })

  // f(x) = 2 + 4x + x^2 + 5x^3

  t.is(p.evaluate(1n), 12n)
  t.is(p.evaluate(2n), 54n)
  t.is(p.evaluate(3n), 57n)
})

test('should multiply term', t => {
  const f = new ScalarField(101n)
  const p = new Polynomial(f)

  // x^2
  p.term({ coef: 1n, exp: 2n })
  // 5*x^3
  p.term({ coef: 5n, exp: 3n })

  const outP = new Polynomial(f)
  outP.terms = p._mulTerm({ coef: 2n, exp: 5n })

  // expect to have
  // 2*x^7 + 10*x^8
  const expected = new Polynomial(f)
    .term({ coef: 2n, exp: 7n })
    .term({ coef: 10n, exp: 8n })

  t.is(outP.equal(expected), true)
})

test('should multiply polynomials', t => {
  const f = new ScalarField(101n)
  const p1 = new Polynomial(f)

  // x^2
  p1.term({ coef: 1n, exp: 2n })
  // -5*x^3
  p1.term({ coef: -5n, exp: 3n })

  const p2 = new Polynomial(f)
  // 20*x^9
  p2.term({ coef: 20n, exp: 9n })
  // 12*x^4
  p2.term({ coef: 12n, exp: 4n })

  // expect to have
  // 20*x^11 + 12*x^6 - 100*x^12 - 60*x^7
  const expected = new Polynomial(f)
  expected.term({ coef: 20n, exp: 11n })
  expected.term({ coef: 12n, exp: 6n })
  expected.term({ coef: -100n, exp: 12n })
  expected.term({ coef: -60n, exp: 7n })

  p1.mul(p2)

  t.is(expected.equal(p1), true)
})

// implicitly tests add/neg function as well
test('should subtract polynomials', t => {
  const f = new ScalarField(101n)
  const p1 = new Polynomial(f)

  // x^2
  p1.term({ coef: 1n, exp: 2n })
  // -5*x^3
  p1.term({ coef: -5n, exp: 3n })

  const p2 = new Polynomial(f)
  // 20*x^9
  p2.term({ coef: 20n, exp: 9n })
  // 12*x^4
  p2.term({ coef: 12n, exp: 4n })

  // expect to have
  // x^2 - 5*x^3 - 20*x^9 - 12*x^4
  const expected = new Polynomial(f)
  expected.term({ coef: 1n, exp: 2n })
  expected.term({ coef: -5n, exp: 3n })
  expected.term({ coef: -20n, exp: 9n })
  expected.term({ coef: -12n, exp: 4n })

  p1.sub(p2)

  t.is(expected.equal(p1), true)
})

test('should divide polynomials', t => {
  const f = new ScalarField(101n)
  const p1 = new Polynomial(f)

  // x^2
  p1.term({ coef: 1n, exp: 2n })
  // 2*x
  p1.term({ coef: 2n, exp: 1n })
  // -7
  p1.term({ coef: -7n, exp: 0n })

  const p2 = new Polynomial(f)
  // x
  p2.term({ coef: 1n, exp: 1n })
  // -2
  p2.term({ coef: -2n, exp: 0n })

  // expect to have
  // q: x + 4
  // r: 1
  const expectedQ = new Polynomial(f)
  expectedQ.term({ coef: 1n, exp: 1n })
  expectedQ.term({ coef: 4n, exp: 0n })
  const expectedR = new Polynomial(f)
  expectedR.term({ coef: 1n, exp: 0n })

  const { q, r } = p1.div(p2)

  t.is(expectedQ.equal(q), true)
  t.is(expectedR.equal(r), true)

  t.is(q.mul(p2).add(r).equal(p1), true)
})

test('should divide more complex polynomials', t => {
  const f = new ScalarField(101n)
  const p1 = new Polynomial(f)

  // x^4
  p1.term({ coef: 1n, exp: 4n })
  // 2*x^3
  p1.term({ coef: 2n, exp: 3n })
  // -3*x^2
  p1.term({ coef: -3n, exp: 2n })
  // 1
  p1.term({ coef: 1n, exp: 0n })

  const p2 = new Polynomial(f)
  // 2*x^2
  p2.term({ coef: 2n, exp: 2n })
  // -1*x
  p2.term({ coef: -1n, exp: 1n })
  // 3
  p2.term({ coef: 3n, exp: 0n })

  // expect to have
  // q: (1/2)*x^2 + (5/4)*x - (13/8)
  // r: -(43/8)*x + (47/8)
  const expectedQ = new Polynomial(f)
  expectedQ.term({ coef: f.div(1n, 2n), exp: 2n })
  expectedQ.term({ coef: f.div(5n, 4n), exp: 1n })
  expectedQ.term({ coef: f.div(-13n, 8n), exp: 0n })
  const expectedR = new Polynomial(f)
  expectedR.term({ coef: f.div(-43n, 8n), exp: 1n })
  expectedR.term({ coef: f.div(47n, 8n), exp: 0n })

  const { q, r } = p1.div(p2)

  t.is(expectedQ.equal(q), true)
  t.is(expectedR.equal(r), true)

  t.is(q.mul(p2).add(r).equal(p1), true)
})

test('should calculate lagrange polynomial', t => {
  const f = new ScalarField(101n)
  const count = 5
  const xValues = Array(count).fill().map(() => f.mod(BigInt(Math.floor(Math.random()*10000))))
  const yValues = Array(count).fill().map(() => f.mod(BigInt(Math.floor(Math.random()*10000))))
  const poly = Polynomial.lagrange(xValues, yValues, f)

  for (let i = 0; i < xValues.length; i++) {
    t.is(poly.evaluate(xValues[i]), yValues[i])
  }
})
