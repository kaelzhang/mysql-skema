const {model} = require('./model')
const {error} = require('./error')

module.exports = model

Object.assign(model, require('./types'))
