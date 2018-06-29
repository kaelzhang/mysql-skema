const {
  model
} = require('./model')
const {error} = require('./error')
const {
  type
} = require('skema')

require('./types')

module.exports = model

model.enum = function (array) {
  const quotedArray = array.map(v => `'${v}'`)
  const last = quotedArray.pop()
  const enumString = quotedArray.length
    ? `${quotedArray.join(', ')} or ${last}`
    : last

  return type({
    validate (v) {
      if (~array.indexOf(v)) {
        return true
      }

      throw error('ENUM_CONFLICT', v, enumString)
    }
  })
}
