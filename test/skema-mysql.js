const {test} = require('piapia')
const mysql = require('../src')
const forEach = require('lodash.foreach')
const {isObject} = require('core-util-is')

function deepEqual (t, result, expect, prefix = '') {
  forEach(expect, (value, key) => {
    prefix = `${prefix}.${key}`

    if (isObject(value)) {
      deepEqual(t, result[key], value, prefix)
      return
    }

    t.is(result[key], value, prefix)
  })
}

test('basic', t => {
  const Member = mysql('Member', {
    _id: {
      enumerable: false,
      type: 'sql-id'
    },

    id: 'sql-id',
    name: String
  }, {
    keyMap: {
      _id: 'id',
      id: 'member_id'
    }
  })

  const id = '222222222222222222222222'
  const _id = '1111111111111111111111111'
  const name = 'kael'

  const record = {
    id: _id,
    member_id: id,
    name
  }

  deepEqual(t, Member.from(record), {
    _id,
    id,
    name
  }, 'from ')
})
