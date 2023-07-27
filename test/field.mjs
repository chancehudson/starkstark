import { ScalarField } from '../ScalarField.mjs'
import test from 'ava'

test('should exponentiate in field', t => {
  const f = new ScalarField(3221225473n, 5n)
  const e = BigInt(Math.floor(Math.random() * 1000))
  const v = BigInt(Math.floor(Math.random() * 1000))

  let actual = 1n
  for (let x = 0n; x < e; x++) {
    actual = f.mul(actual, v)
  }

  t.is(actual, f.exp(v, e))
})

test('should get generator value for subgroup', t => {
  const f = new ScalarField(3221225473n, 5n)

  const size = 2n**10n
  const g = f.generator(size)

  let exp = 1n
  for (let x = 0n; x < size-1n; x++) {
    exp = f.mul(exp, g)
    t.not(exp, 1n)
  }
  exp = f.mul(exp, g)
  t.is(exp, 1n)
})
