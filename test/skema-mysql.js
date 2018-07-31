const {test} = require('piapia')
const mysql = require('../src')
const forEach = require('lodash.foreach')
const {isObject} = require('core-util-is')
const snakecase = require('lodash.snakecase')
const camelcase = require('lodash.camelcase')

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

const JSONEqual = (t, result, expect, ...extra) => {
  t.is(JSON.stringify(result), JSON.stringify(expect), ...extra)
}

const MEMBER_RULES = {
  _id: {
    enumerable: false,
    type: 'sql-id'
  },

  id: 'sql-id',
  name: String
}

const MEMBER_KEY_MAP = {
  _id: 'id',
  id: 'member_id'
}

const id = '222222222222222222222222'
const _id = '1111111111111111111111111'
const name = 'kael'
const nick_name = 'kael2'

test('basic', t => {
  const Member = mysql('Member', MEMBER_RULES, {
    keyMap: MEMBER_KEY_MAP
  })

  const record = {
    id: _id,
    member_id: id,
    name
  }

  const member = Member.from(record)

  deepEqual(t, member, {
    _id,
    id,
    name
  }, 'from ')

  JSONEqual(t, member, {
    id, name
  }, 'test enumerable')
})

test('keyMapper', t => {
  const Member = mysql('Member', {
    ...MEMBER_RULES,
    nickName: String
  }, {
    keyMap: MEMBER_KEY_MAP,
    keyMappers: [snakecase, camelcase]
  })

  const record = {
    id: _id,
    member_id: id,
    name: 'kael',
    nick_name
  }

  const member = Member.from(record)
  deepEqual(t, member, {
    _id,
    id,
    name,
    nickName: nick_name
  })
})

test('enum', t => {
  const Type = mysql('Type', {
    type: mysql.enum(['a', 'b', 'c'])
  })

  t.throws(() => {
    Type.from({
      type: 'd'
    })
  })

  const obj = Type.from({
    type: 'a'
  })

  t.is(obj.type, 'a')
})

test('duplex, fromR', async t => {
  const Type = mysql('Type', {
    type: [String, Number]
  })

  const record = {
    type: 1
  }

  const obj = Type.from(record)

  t.is(obj.type, '1')
  t.is(Type.fromR(obj).type, 1)
})

test('nested model', async t => {
  const Type = mysql('Type', {
    a: [String, Number]
  })

  const Type2 = mysql('Type2', {
    b: 'number',
    a: [Type, {
      type: Type,
      enumerable: false
    }]
  })

  const record = {
    b: 1,
    a: {
      a: 1
    }
  }

  const obj = Type2.from(record)
  t.is(obj.a.a, '1', 'obj.a.a')

  const objR = Type2.fromR(obj)
  JSONEqual(t, objR, {
    b: 1
  }, 'enumerable')
})

test('invalid type', async t => {
  t.throws(() => {
    mysql('any', {
      a: 1
    })
  }, 'invalid type 1')
})

test('optional', async t => {
  const A = mysql('A', {
    a: [String, Number]
  })

  const B = mysql('B', {
    a: A.optional(),
    b: Number,
    c: A
  })

  t.throws(() => {
    B.from({
      b: 1
    })
  })

  const record = {
    b: 1,
    c: {
      a: 1
    }
  }

  const b = B.from(record)
  t.is(b.a, undefined)
  t.is(b.c.a, '1')

  t.deepEqual(B.keys, ['a', 'b', 'c'])
})

test('arrayOf', async t => {
  const A = mysql('A', {
    a: [String, Number]
  })

  const AA = A.arrayOf()

  const records = [{
    a: 1
  }, {
    a: 2
  }]

  deepEqual(t, AA.from(records), [{
    a: '1'
  }, {
    a: '2'
  }])
})

test('built-in optional', async t => {
  const A = mysql('A', {
    a: 'sql-id?'
  })

  const a = A.from({})
  t.is(a.a, undefined)
  a.a = 1

  t.is(a.a, '1')
})

test('duplicate map key', async t => {
  t.throws(() => {
    mysql('A', {
      a: Number,
      b: String
    }, {
      keyMap: {
        a: 'a',
        b: 'a'
      }
    })
  }, `duplicate map key 'a'`)
})
