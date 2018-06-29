const {D} = require('./model')
const {any} = require('skema')
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
      throw error('SCHEMA_NOT_ID')
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
      throw new TypeError('invalid timestamp')
    }

    return timestamp
  }
}, {
  set (value) {
    return new Date(value)
  }
})
