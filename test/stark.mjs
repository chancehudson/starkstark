import test from 'ava'
import { ScalarField } from '../src/ScalarField.mjs'
import { MultiPolynomial } from '../src/MultiPolynomial.mjs'
import { Polynomial } from '../src/Polynomial.mjs'
import { STARK } from '../src/stark.mjs'
import { Channel } from '../src/Channel.mjs'

const f = new ScalarField(
  1n + 407n * (1n << 119n),
  85408008396924667383611388730472331217n
)

test('should generate a single register STARK proof', t => {
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

  const proof = stark.prove(trace, transitionConstraints, boundaryConstraints)
  const valid = stark.verify(proof, transitionConstraints, boundaryConstraints)
  t.true(valid)
})

test('should generate a multi register STARK proof', t => {
  const sequenceLength = 120
  const registerCount = 4

  const stark = new STARK({
    field: f,
    expansionFactor: 4,
    colinearityTestCount: 8,
    offset: f.g,
    registerCount,
    originalTraceLength: sequenceLength,
    transitionConstraintsDegree: 2
  })

  const trace = [Array(registerCount).fill().map(() => f.random())]

  while (trace.length < sequenceLength) {
    trace.push([])
    for (let x = 0; x < registerCount; x++) {
      const e1 = trace[trace.length - 2][x]
      trace[trace.length-1].push(f.mul(e1, e1))
    }
  }

  // trace index, register index, value
  const boundaryConstraints = [
    ...trace[0].map((v, i) => [0n, BigInt(i), v]),
    ...trace[trace.length-1].map((v, i) => [BigInt(sequenceLength-1), BigInt(i), v])
  ]

  const variables = Array(1+2*registerCount).fill().map((_, i) => {
    return new MultiPolynomial(f)
      .term({ coef: 1n, exps: { [i]: 1n }})
  })
  const cycleIndex = variables[0]
  const prevState = variables.slice(1, 1+registerCount)
  const nextState = variables.slice(1+registerCount, 1+2*registerCount)
  const transitionConstraints = Array(registerCount).fill().map((_, i) => prevState[i].copy().mul(prevState[i]).sub(nextState[i]))

  const proof = stark.prove(trace, transitionConstraints, boundaryConstraints)
  const valid = stark.verify(proof, transitionConstraints, boundaryConstraints)
  t.true(valid)
})

test('should fail to verify proof with invalid trace', t => {
  // t.timeout(2000 * 1000)
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
  // invalid entry
  trace[5] = [3n]

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

  const proof = stark.prove(trace, transitionConstraints, boundaryConstraints)
  t.throws(() => stark.verify(proof, transitionConstraints, boundaryConstraints))
})

test('should fail to verify bad proof', t => {
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

  const proof = stark.prove(trace, transitionConstraints, boundaryConstraints)
  const parsed = Channel.deserialize(proof)
  parsed.messages[0] += 1n
  try {
    stark.verify(parsed.serialize(), transitionConstraints, boundaryConstraints)
  } catch (err) {
    // randomly modifying the first element of the proof
    // causes the verifier to sample different indices
    // this will cause either the FRI verification to fail
    // with points that are not colinear, or a merkle root
    // verification failure
    if (err.message === 'points are not colinear' || err.message === 'Invalid intermediate root')
      t.pass()
  }
})
