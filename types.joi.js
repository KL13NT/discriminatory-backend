const Joi = require('@hapi/joi')
const { isValidObjectId } = require('mongoose')

const ID = Joi.string()
	.trim()
	.min(1)
	.custom((value, helpers) =>
		isValidObjectId(value) ? value : helpers.error('any.invalid')
	)

module.exports = { ID }
