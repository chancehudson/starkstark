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
