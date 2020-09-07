const Joi = require('@hapi/joi')
const { isValidObjectId } = require('mongoose')

const ID = Joi.string()
	.trim()
	.min(1)
	.custom((value, helpers) => {
		try {
			return isValidObjectId(value)
				? value
				: helpers.message('ID must conform to an ObjectId')
		} catch (err) {
			return helpers.message('ID must conform to an ObjectId')
		}
	})

module.exports = { ID }
