const {type, shape, arrayOf} = require('skema')
const forEach = require('lodash.foreach')
const {isArray, isString} = require('core-util-is')

const TYPES = {}

function D (name, toData, toDB) {
  // if (name in TYPES) {
  //   throw new Error(`'${name}' should not be defined again`)
  // }

  toData = type(toData)
  toDB = toDB
    ? type(toDB)
    : toData

  TYPES[name] = [toData, toDB]
}

exports.D = D

// map: {ab_cd: 'abCd'}

// from: {ab_cd: '1'} -> {abCd: '1'} -> {abCd: 1}
// shape: {abCd: type}

// reverseFrom: {abCd: 1} -> {ab_cd: 1} -> {ab_cd: '1'}
// reverseShape: {ab_cd: reverseType}
class Shape {
  constructor ({
    shape,
    // xX -> x_x
    shapeKeyMapper,
    // x_x -> xX
    keyMapper,
    typeIndex
  }) {
    this._shapeKeyMapper = shapeKeyMapper
    this._keyMapper = keyMapper
    this._typeIndex = typeIndex
    this._keys = null
    this._skema = null

    this._convertShape(shape)
  }

  get skema () {
    return this._skema
  }

  get keys () {
    return this._keys
  }

  _convertShape (s) {
    const merged = s

    const converted = Object.create(null)
    const keys = Object.keys(merged)

    keys.forEach(key => {
      const convertedKey = this._shapeKeyMapper
        ? this._shapeKeyMapper(key)
        : key

      converted[convertedKey] = {
        type: this._convertType(merged[key]),
        key: this._keyMapper
      }
    })

    this._keys = keys
    this._skema = shape(converted, true)
  }

  _convertType (alias) {
    if (isArray(alias)) {
      return this._convertArrayType(alias)
    }

    return this._convertNonArrayType(alias)
  }

  _convertArrayType (array) {
    return this._convertType(
      array[this._typeIndex] || array[0])
  }

  _convertNonArrayType (alias) {
    if (alias instanceof Model) {
      return this._convertModelType(alias)
    }

    if (isString(alias)) {
      return this._convertStringType(alias)
    }

    if (Object(alias) !== alias) {
      throw new Error(`invalid type ${alias}`)
    }

    return this._convertObjectType(alias)
  }

  _convertModelType (model) {
    return this._typeIndex === 0
      ? model.skema
      : model.skemaR
  }

  // 'abc' -> Type
  // 'abc?' -> Type
  _convertStringType (string) {
    const [s, optional] = parseTypeString(string)
    const t = s in TYPES
      ? TYPES[s][this._typeIndex]
      : type(s)

    return optional
      ? optionalType(t)
      : t
  }

  _convertObjectType (object) {
    const {
      type: t,
      ...others
    } = object

    if (!t) {
      return type(object)
    }

    const skema = this._convertType(t)
    others.type = skema
    return type(others)
  }
}

class Model {
  constructor (...args) {
    [this._skema, this._skemaR] = this._createSkema(...args)
  }

  _createSkema (skema, skemaR) {
    return [skema, skemaR]
  }

  optional () {
    const {
      skema,
      skemaR
    } = this

    return new Model(
      optionalType(skema),
      optionalType(skemaR)
    )
  }

  arrayOf () {
    const {
      skema,
      skemaR
    } = this

    return new Model(
      arrayOf(skema),
      arrayOf(skemaR)
    )
  }

  get skema () {
    return this._skema
  }

  get skemaR () {
    return this._skemaR
  }

  from (...args) {
    return this._skema.from(...args)
  }

  fromR (...args) {
    return this._skemaR.from(...args)
  }
}

// Suppose

// id   |  member_id  |  name
// ---- | ----------- | -----------
// 1    | 15123       | 'kael'

// ->
// {
//   _id: 1,
//   id: 15123,
//   name: 'kael'
// }

// keyMap:
// {
//
//   _id: 'id'
//   id: 'member_id'
// }

// shape:
// {
//   _id: {
//     enumerable: false
//   }
// }

const DEFAULT_OPTIONS = {
  keyMappers: []
}

const JUST_RETURN = x => x

class TypeModel extends Model {
  _createSkema (s, {
    keyMap = {},
    keyMappers: [
      // _id -> id
      keyMapper = JUST_RETURN,
      // id -> id
      reverseKeyMapper = JUST_RETURN
    ] = []
  } = DEFAULT_OPTIONS) {
    // aB -> a_b
    this._map = keyMap
    // a_b -> aB
    this._reverseMap = reverseMap(keyMap)
    this._keyMapper = keyMapper
    this._reverseKeyMapper = reverseKeyMapper

    // db -> data
    const shape = new Shape({
      shape: s,
      // _id -> id
      shapeKeyMapper: key => this._mapKey(key),
      // id -> _id
      keyMapper: key => this._reverseMapKey(key),
      typeIndex: 0
    })

    // data -> db
    const shapeReversed = new Shape({
      shape: s,
      shapeKeyMapper: null,
      keyMapper: key => this._mapKey(key),
      typeIndex: 1
    })

    this._shape = shape
    this._shapeR = shapeReversed

    return [shape.skema, shapeReversed.skema]
  }

  get keys () {
    return this._shape.keys
  }

  get keysR () {
    return this._shapeR.keys
  }

  _mapKey (key) {
    return this._map[key] || this._keyMapper(key)
  }

  _reverseMapKey (key) {
    return this._reverseMap[key] || this._reverseKeyMapper(key)
  }
}

function parseTypeString (string) {
  string = string.trim()
  let optional = false
  if (string.endsWith('?')) {
    optional = true
    string = string.slice(0, -1).trimRight()
  }

  return [string, optional]
}

function optionalType (t) {
  return type({
    type: t,
    optional: true
  })
}

function reverseMap (map) {
  const to = {}
  forEach(map, (value, key) => {
    if (value in to) {
      throw new Error(`duplicate map key '${value}'`)
    }

    to[value] = key
  })
  return to
}

// model factory
function model (name, rules, options) {
  const host = {
    [name]: class extends TypeModel {
      // static get [Symbol.species] () {
      //   return Model
      // }

      constructor () {
        super(rules, options)
      }
    }
  }

  return new host[name]
}

// factory
exports.model = model
model.defineType = D
