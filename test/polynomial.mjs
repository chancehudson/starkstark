import test from 'ava'
import { ScalarField } from '../src/ScalarField.mjs'
import { Polynomial } from '../src/Polynomial.mjs'

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

  t.is(outP.isEqual(expected), true)
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

  t.is(expected.isEqual(p1), true)
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

  t.is(expected.isEqual(p1), true)
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

  t.is(expectedQ.isEqual(q), true)
  t.is(expectedR.isEqual(r), true)

  t.is(q.mul(p2).add(r).isEqual(p1), true)
})

test('should divide with coset FFT division', t => {
  const f = new ScalarField(3221225473n, 5n)
  const size = 1024n
  const g = f.generator(size)
  const domain = Array(33n).fill().map((_, i) => f.exp(g, BigInt(i)))
  const denom = Polynomial.zeroifierDomainFFT(domain, g, size, f)
  const expected = new Polynomial(f)
  for (let x = 0n; x < 32n; x++) {
    expected.term({ coef: f.random(), exp: x })
  }
  const numer = denom.copy().mul(expected)
  const { q, r } = numer.copy().div(denom)
  t.true(r.isZero())
  const _q = Polynomial.fastCosetDivide(numer, denom, 5n, g, size, f)
  t.true(denom.copy().mul(_q).isEqual(numer))
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

  t.is(expectedQ.isEqual(q), true)
  t.is(expectedR.isEqual(r), true)

  t.is(q.mul(p2).add(r).isEqual(p1), true)
})

test('should calculate lagrange polynomial', t => {
  const f = new ScalarField(3221225473n, 5n)
  const count = 5
  const random = () => {
    let r = BigInt(Math.floor(Math.random() * 1000))
    r = f.mod(r)
    if (r === 0n) r += 1n
    return r
  }
  // need to make sure no x values are duplicated
  const xValues = []
  while (xValues.length < count) {
    const v = random()
    if (xValues.indexOf(v) !== -1) continue
    xValues.push(v)
  }
  const yValues = Array(count).fill().map(() => random())
  const poly = Polynomial.lagrange(xValues, yValues, f)

  for (let i = 0; i < xValues.length; i++) {
    t.is(poly.evaluate(xValues[i]), yValues[i])
  }
})

test('should compose polynomial', t => {
  const f = new ScalarField(101n)
  // x + 1
  const p = new Polynomial(f)
    .term({ coef: 1n, exp: 1n })
    .term({ coef: 1n, exp: 0n })
  // 2*(x + 1)^2 + 2
  const b = new Polynomial(f)
    .term({ coef: 2n, exp: 2n })
    .term({ coef: 2n, exp: 0n })
    .compose(p)
  // 2x^2 + 4x + 4
  const expected = new Polynomial(f)
    .term({ coef: 2n, exp: 2n })
    .term({ coef: 4n, exp: 1n })
    .term({ coef: 4n, exp: 0n })

  t.true(b.isEqual(expected))
})

test('should evaluate polynomial using FFT', t => {
  const f = new ScalarField(3221225473n, 5n)
  const p = new Polynomial(f)

  p.term({ coef: 1n, exp: 2n })
  p.term({ coef: 4n, exp: 1n })
  p.term({ coef: 2n, exp: 0n })
  p.term({ coef: 5n, exp: 3n })

  // f(x) = 2 + 4x + x^2 + 5x^3

  // let's get a multiplicate subgroup
  const size = 2n**8n
  const g = f.generator(size)
  const G = Array(Number(size)).fill().map((_, i) => f.exp(g, BigInt(i)))

  const out = p.evaluateFFT(G)
  const actual = p.evaluateBatch(G)
  for (let i = 0; i < G.length; i++) {
    t.is(out[i], actual[i])
  }
  t.is(out.length, actual.length)
})

test('should evaluate high degree polynomial using FFT', t => {
  const f = new ScalarField(3221225473n, 5n)
  const p = new Polynomial(f)
  for (let x = 0n; x < 128n; x++) {
    p.term({ coef: f.random(), exp: x })
  }
  const size = 2n**10n
  const g = f.generator(size)
  const G = Array(Number(size)).fill().map((_, i) => f.exp(g, BigInt(i)))
  const out = p.evaluateFFT(G)
  const actual = p.evaluateBatch(G)
  for (let i = 0; i < G.length; i++) {
    t.is(out[i], actual[i])
  }
  t.is(out.length, actual.length)
})

test('should multiply polynomials using FFT', t => {
  const f = new ScalarField(3221225473n, 5n)
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
  const out1 = p1.copy().mulFFT(p2)
  const actual = p1.copy().mul(p2)

  t.true(out1.isEqual(actual))
})

test('should multiply high degree polynomials using FFT', t => {
  const f = new ScalarField(3221225473n, 5n)
  const size = 128n
  const p1 = new Polynomial(f)
  const p2 = new Polynomial(f)
  for (let x = 0n; x < size; x++) {
    p1.term({ coef: f.random(), exp: x })
    p2.term({ coef: f.random(), exp: x })
  }
  const expected = p1.copy().mul(p2)
  const out = p1.mulFFT(p2)

  t.true(out.isEqual(expected))
})

test('should compute zerofier for domain', t => {
  const f = new ScalarField(3221225473n, 5n)
  const g = f.generator(1024n)
  const domain = Array(500).fill().map((_, i) => f.exp(g, BigInt(i)))
  const zeroifier = Polynomial.zeroifierDomain(domain, f)
  for (const d of domain) {
    t.is(0n, zeroifier.evaluate(d))
  }
})

test('should compute zerofier for domain using FFT', t => {
  const f = new ScalarField(3221225473n, 5n)
  const size = 32n
  const g = f.generator(size)
  const domain = Array(20).fill().map((_, i) => f.exp(g, BigInt(i)))
  const zeroifier = Polynomial.zeroifierDomain(domain, f)
  const zeroifierFast = Polynomial.zeroifierDomainFFT(domain, g, size, f)
  for (const d of domain) {
    t.is(0n, zeroifier.evaluate(d))
    t.is(0n, zeroifierFast.evaluate(d))
  }
  t.true(zeroifier.isEqual(zeroifierFast))
})

test('should fail to compute zerofier for too many points with FFT', t => {
  const f = new ScalarField(3221225473n, 5n)
  const size = 32n
  const g = f.generator(size)
  const domain = Array(Number(size)).fill().map((_, i) => f.exp(g, BigInt(i)))
  t.throws(() => Polynomial.zeroifierDomainFFT(domain, g, size, f))
})

test('should fail to compute zerofier for incorrect generator with FFT', t => {
  const f = new ScalarField(3221225473n, 5n)
  const size = 32n
  const g = f.generator(size)
  const domain = Array(2).fill().map((_, i) => f.exp(g, BigInt(i)))
  t.throws(() => Polynomial.zeroifierDomainFFT(domain, 2n*g, size, f))
})

test('should exponentiate polynomial', t => {
  const f = new ScalarField(3221225473n, 5n)
  const p = new Polynomial(f)
    .term({ coef: 89n, exp: 2n })
    .term({ coef: 8n, exp: 9n })
    .term({ coef: 28n, exp: 4n })

  t.true(p.copy().exp(0n).isEqual(new Polynomial(f).term({ coef: 1n, exp: 0n })))
  t.true(p.copy().exp(1n).isEqual(p))

  const p2 = p.copy().mul(p)
  t.true(p.copy().exp(2n).isEqual(p2))

  const p3 = p.copy().mul(p).mul(p)
  t.true(p.copy().exp(3n).isEqual(p3))
})
