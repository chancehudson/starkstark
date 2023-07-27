import { ScalarField } from './ScalarField.mjs'

const field = new ScalarField(3221225473n, 5n)

const traceElements = [1n, 3141592n]

// g is the generator point for group of 1024 elements
// we'll construct it here
// field is 3*2^30 so we do 3*2^20 for a difference of 1024
const g = field.generator(1024n)

// check order of resulting g value
let b = 1n
for (let x = 0; x < 1023; x++) {
  b = field.mul(b, g)
  if (b === 1n) throw new Error(`g is of order ${x+1}`)
}
if (field.mul(b, g) !== 1n) throw new Error(`g is of order > 1024`)

while (traceElements.length < 1023) {
  const e1 = traceElements[traceElements.length - 1]
  const e2 = traceElements[traceElements.length - 2]
  traceElements.push(
    field.add(field.mul(e1, e1), field.mul(e2, e2))
  )
}
