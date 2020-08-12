const Joi = require('@hapi/joi')
const {
	DISPLAYNAME_MAX,
	DISPLAYNAME_MIN,
	ID_MAX,
	ID_MIN,
	TAGLINE_MAX,
	TAGLINE_MIN,
	LOCATION_MAX,
	LOCATION_MIN
} = require('../constants')

const profile = Joi.object({
	displayName: Joi.string()
		.pattern(/^[a-zA-Z ]+$/)
		.trim()
		.min(DISPLAYNAME_MIN)
		.max(DISPLAYNAME_MAX)
		.required(),

	dateofbirth: Joi.date()
		.max(new Date(new Date() - 409968000000)) // 13 years old
		.required(),
	// .error(() => Error('You must be over the age of 13 to use the service.')),

	location: Joi.string()
		.min(LOCATION_MIN)
		.max(LOCATION_MAX)
		.required(),

	tagline: Joi.string()
		.min(TAGLINE_MIN)
		.max(TAGLINE_MAX),

	id: Joi.string()
		.required()
		.min(ID_MIN)
		.max(ID_MAX),

	email: Joi.string()
		.email()
		.required()
})

module.exports = { profile }
