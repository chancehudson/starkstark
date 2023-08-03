import { FRI } from './fri.mjs'
import { Channel } from './Channel.mjs'


export class STARK {
  constructor(config) {
    const {
      field,
      expansionFactor,
      colinearityTestCount,
      domainLength,
      omega,
      offset,
      securityLevel, // lambda
      registerCount,
      originalTraceLength,
      transitionConstraintsDegree // 2 by default ?
    } = config

    this.field = field
    this.randomizerCount = 4*this.colinearityTestCount
    this.registerCount = registerCount
    this.originalTraceLength = originalTraceLength
    this.randomizedTraceLength = this.originalTraceLength + this.randomizerCount

    this.omicronDomainLength = 1n << BigInt(BigInt(this.randomizedTraceLength * transitionConstraintsDegree).toString(2).length)
    this.friDomainLength = omicronDomainLength * BigInt(expansionFactor)

    this.omega = this.field.generator(this.friDomainLength)
    this.omicron = this.field.generator(this.omicronDomainLength)
    this.omicronDomain = Array(this.omicronDomainLength).fill().map((_, i) => this.field.exp(this.omicron, BigInt(i)))

    this.fri = new FRI({
      ...config,
      domainLength: Number(this.friDomainLength),
      omega: this.omega,
    })
  }

  // transitionDegreeBounds() {
  //   const pointDegrees = [
  //     1n,
  //     BigInt(this.originalTraceLength + this.randomizerCount - 1),
  //     2n * BigInt(this.registerCount)
  //   ]
  // }

  prove(trace, transitionConstraints, boundary, proofStream) {
    if (!proofStream) {
      proofStream = new Channel()
    }
    for (let x = 0; x < this.randomizerCount; x++) {
      trace.push(Array(this.registerCount).fill().map(() => this.field.random()))
    }

    const traceDomain = Array(trace.length).fill().map((_, i) => this.field.exp(this.omicron, BigInt(i)))
    const tracePolynomials = []

    for (let x = 0; x < this.registerCount; x++) {
      const singleTrace = trace.map(v => v[x])
      tracePolynomials.push(Polynomial.lagrange(traceDomain, singleTrace))
    }

    const boundaryQuotient = []
    for (let x = 0; x < this.registerCount; x++) {
      // const interpolant =
    }
  }
}
