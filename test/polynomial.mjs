import test from 'ava'
import { ScalarField } from '../ScalarField.mjs'
import { Polynomial } from '../Polynomial.mjs'

test('should sort polynomial terms', t => {
  const f = new ScalarField(17n)
  const p = new Polynomial(f)

  p.term(1n, 2n)
  p.term(4n, 1n)
  p.term(2n, 0n)
  p.term(5n, 3n)

  for (let x = 0; x < 4; x++) {
    t.is(p.sortedTerms[x].exp, BigInt(x))
  }
})

test('should evaluate polynomial', t => {
  const f = new ScalarField(101n)
  const p = new Polynomial(f)

  p.term(1n, 2n)
  p.term(4n, 1n)
  p.term(2n, 0n)
  p.term(5n, 3n)

  // f(x) = 2 + 4x + x^2 + 5x^3

  t.is(p.evaluate(1n), 12n)
  t.is(p.evaluate(2n), 54n)
  t.is(p.evaluate(3n), 57n)
})
