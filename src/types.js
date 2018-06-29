const {D} = require('./model')
const {any, type} = require('skema')
const make_array = require('make-array')
const {isArray} = require('core-util-is')
const {error} = require('./error')

const Any = any()

function isNumeric (string) {
  const n = Number(string)
  return !Number.isNaN(n)
}

D('sql-id', {
  set (value) {
    if (!isNumeric(value)) {
      throw error('INVALID_ID')
    }

    return String(value)
  }
}, Any)

// Convert MySql JSON array -> JavaScript array
D('sql-array', {
  set (value) {
    if (isArray(value)) {
      return value
    }

    const array = JSON.parse(value)
    return make_array(array)
  }
}, {
  set: JSON.stringify
})

D('sql-boolean', Boolean, {
  set: bool => bool
    ? 1
    : 0
})

D('sql-json', {
  set (value) {
    if (!value) {
      return Object.create(null)
    }

    try {
      return JSON.parse(value)
    } catch (e) {
      throw error('INVALID_JSON', value)
    }
  }
}, {
  set: JSON.stringify
})

D('sql-timestamp', {
  set (value) {
    const timestamp = Date.parse(value)
    if (Number.isNaN(timestamp)) {
      throw error('INVALID_TIMESTAMP')
    }

    return timestamp
  }
}, {
  set (value) {
    return new Date(value)
  }
})

const ON_ERROR = (v, array) => {
  const quotedArray = array.map(v => `'${v}'`)
  const last = quotedArray.pop()
  const enumString = quotedArray.length
    ? `${quotedArray.join(', ')} or ${last}`
    : last

  throw error('ENUM_CONFLICT', v, enumString)
}

exports.enum = (array, onerror = ON_ERROR) => type({
  validate (v) {
    if (~array.indexOf(v)) {
      return true
    }

    onerror(v, array)
  }
})
