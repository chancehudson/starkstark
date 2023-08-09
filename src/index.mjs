import { STARK } from './stark.mjs'
import { MultiPolynomial } from './MultiPolynomial.mjs'
import { ScalarField } from './ScalarField.mjs'

export const field = new ScalarField(
  1n + 407n * (1n << 119n),
  85408008396924667383611388730472331217n
)

export const starkVariables = (registerCount, _field = field) => {
  const variables = Array(1+2*registerCount).fill().map((_, i) => {
    return new MultiPolynomial(_field)
      .term({ coef: 1n, exps: { [i]: 1n } })
  })
  const cycleIndex = variables[0]
  const prevState = variables.slice(1, 1+registerCount)
  const nextState = variables.slice(1+registerCount, 1+2*registerCount)
  return { cycleIndex, prevState, nextState }
}

export const defaultStark = (traceLength, registerCount, _field = field) => new STARK({
  field: _field,
  expansionFactor: 4,
  colinearityTestCount: 8,
  offset: _field.g,
  registerCount,
  originalTraceLength: traceLength,
  transitionConstraintsDegree: 2
})
