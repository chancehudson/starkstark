import test from 'ava'
import { field, starkVariables, defaultStark } from '../src/index.mjs'

test('should get default stark prover', t => {
  const stark = defaultStark(10, 2)
  t.is(typeof stark.prove, 'function')
  t.is(typeof stark.verify, 'function')
  t.truthy(stark.field)
})

test('should get stark variables', t => {
  const vars = starkVariables(10)
  t.truthy(vars.cycleIndex)
  t.is(vars.prevState.length, 10)
  t.is(vars.nextState.length, 10)
})
