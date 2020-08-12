const Joi = require('@hapi/joi')
const {
	POST_CONTENT_MAX,
	POST_CONTENT_MIN,
	LOCATION_MAX,
	LOCATION_MIN
} = require('../constants')

const post = Joi.object({
	content: Joi.string()
		.trim()
		.min(POST_CONTENT_MIN)
		.max(POST_CONTENT_MAX)
		.required(),

	location: Joi.string()
		.trim()
		.min(LOCATION_MIN)
		.max(LOCATION_MAX)
		.required()
})

module.exports = { post }
