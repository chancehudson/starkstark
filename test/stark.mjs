import test from 'ava'
import { ScalarField } from '../src/ScalarField.mjs'
import { MultiPolynomial } from '../src/MultiPolynomial.mjs'
import { Polynomial } from '../src/Polynomial.mjs'
import { STARK } from '../src/stark.mjs'
import { Channel } from '../src/Channel.mjs'

test('should generate a STARK proof', t => {
  // t.timeout(2000 * 1000)
  const f = new ScalarField(
    1n + 407n * (1n << 119n),
    85408008396924667383611388730472331217n
  )
  const stark = new STARK({
    field: f,
    expansionFactor: 4,
    colinearityTestCount: 64,
    offset: f.g,
    securityLevel: 128,
    registerCount: 2,
    originalTraceLength: 31,
    transitionConstraintsDegree: 3
  })

  const trace = [[1n, 0n], [3141592n, 0n]]
  while (trace.length < 31) {
    const e1 = trace[trace.length - 1][0]
    // const e2 = trace[trace.length - 2][0]
    trace.push(
      [f.add(f.mul(e1, e1), 0n/* f.mul(e2, e2)*/), 0n]
    )
  }

  // trace index, register index, value
  const boundaryConstraints = [
    [0n, 1n, 0n],
    [1n, 1n, 0n],
    // [1023n, trace]
  ]

  const transitionConstraints = (omicron) => {
    // dummy constraint
    const variables = Array(1+2).fill().map((_, i) => {
      return new MultiPolynomial(f)
        .term({ coef: 1n, exps: { [i]: 1n }})
    })
    const cycleIndex = variables[0]
    const prevState = variables.slice(1, 2)[0]
    const nextState = variables.slice(2, 3)[0]
    // console.log(prevState.copy().mul(prevState).sub(nextState))
    // console.log(prevState)
    return [
      // prevState.copy().mul(prevState).sub(nextState)
    ]
    // const air = []
    // air.push(prevState.copy().mul(prevState).sub(nextState))
    // return [new MultiPolynomial(f)]
  }

  const proofStream = new Channel()

  const proof = stark.prove(trace, transitionConstraints(stark.omicron), boundaryConstraints, proofStream)
  stark.verify(proof, transitionConstraints(stark.omicron), boundaryConstraints, proofStream)
  t.pass()
})
