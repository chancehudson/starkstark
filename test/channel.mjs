import test from 'ava'
import { Channel } from '../src/Channel.mjs'

test('should get prover hash', t => {
  const c = new Channel()
  const h1 = c.proverHash()

  c.push(1209091n)
  const h2 = c.proverHash()
  t.not(h1, h2)

  c.push(1209091n)
  const h3 = c.proverHash()
  t.not(h2, h3)

  c.pull()
  t.is(h3, c.proverHash())
})

test('should get verifier hash', t => {
  const c = new Channel()
  c.push(1209091n)
  c.push(2102180n)
  c.push(2102180n)
  const h1 = c.verifierHash()
  c.push(129023210n)
  const h2 = c.verifierHash()
  t.is(h1, h2)
  c.pull()
  const h3 = c.verifierHash()
  t.not(h1, h3)
})
