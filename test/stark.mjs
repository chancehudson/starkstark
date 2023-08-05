import test from 'ava'
import { ScalarField } from '../src/ScalarField.mjs'
import { MultiPolynomial } from '../src/MultiPolynomial.mjs'
import { Polynomial } from '../src/Polynomial.mjs'
import { STARK } from '../src/stark.mjs'
import { Channel } from '../src/Channel.mjs'

test('should generate a single register STARK proof', t => {
  // t.timeout(2000 * 1000)
  const f = new ScalarField(
    1n + 407n * (1n << 119n),
    85408008396924667383611388730472331217n
  )
  const sequenceLength = 40
  const stark = new STARK({
    field: f,
    expansionFactor: 4,
    colinearityTestCount: 8,
    offset: f.g,
    registerCount: 1,
    originalTraceLength: sequenceLength,
    transitionConstraintsDegree: 2
  })

  const trace = [[2n], [4n]]
  while (trace.length < sequenceLength) {
    const e1 = trace[trace.length - 1][0]
    trace.push(
      [f.mul(e1, e1)]
    )
  }

  // trace index, register index, value
  const boundaryConstraints = [
    [0n, 0n, 2n],
    [BigInt(sequenceLength-1), 0n, trace[trace.length-1][0]]
  ]

  const variables = Array(1+2).fill().map((_, i) => {
    return new MultiPolynomial(f)
      .term({ coef: 1n, exps: { [i]: 1n }})
  })
  const cycleIndex = variables[0]
  const prevState = variables[1]
  const nextState = variables[2]
  const transitionConstraints = [
    prevState.copy().mul(prevState).sub(nextState)
  ]

  const proofStream = new Channel()

  const proof = stark.prove(trace, transitionConstraints, boundaryConstraints, proofStream)
  const valid = stark.verify(proof, transitionConstraints, boundaryConstraints, proofStream)
  t.true(valid)
})
