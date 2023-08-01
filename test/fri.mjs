import test from 'ava'
import { ScalarField } from '../src/ScalarField.mjs'
import { Polynomial } from '../src/Polynomial.mjs'
import { FRI } from '../src/fri.mjs'
import { Channel } from '../src/Channel.mjs'

test('should prove and verify', t => {
  const proofStream = new Channel()
  const p = 1n + 407n * (1n << 119n)
  const f = new ScalarField(p, 85408008396924667383611388730472331217n)
  const domainSize = 8192
  const domainG = f.generator(BigInt(domainSize))
  const fri = new FRI({
    offset: 5n,
    omega: domainG,
    domainLength: domainSize,
    field: f,
    expansionFactor: 2n,
    colinearityTestCount: 10
  })

  const domain = fri.evalDomain()
  const poly = new Polynomial(f)
    .term({ coef: 3n, exp: 2n })
  const points = domain.map((x) => poly.evaluate(x))
  fri.prove(points, proofStream)
  fri.verify(proofStream)
  t.pass()
})
