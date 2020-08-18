const Joi = require('@hapi/joi')
const firebase = require('firebase-admin')

const User = require('../models/User')

const {
	DISPLAYNAME_MAX,
	DISPLAYNAME_MIN,
	TAGLINE_MAX,
	TAGLINE_MIN,
	PROFILE_LOCATION_MAX,
	PROFILE_LOCATION_MIN
} = require('../constants')
const { enforceVerification } = require('../utils')
const { NotFoundError } = require('../errors')

const validators = {
	updateAccount: Joi.object({
		displayName: Joi.string()
			.pattern(/^[a-zA-Z ]+$/)
			.trim()
			.min(DISPLAYNAME_MIN)
			.max(DISPLAYNAME_MAX)
			.required(),

		dateofbirth: Joi.date()
			.max(new Date(new Date() - 409968000000)) // 13 years old
			.required(),

		location: Joi.string()
			.min(PROFILE_LOCATION_MIN)
			.max(PROFILE_LOCATION_MAX)
			.required(),

		tagline: Joi.string()
			.min(TAGLINE_MIN)
			.max(TAGLINE_MAX),

		email: Joi.string()
			.email()
			.required()
	})
}

const updateAccount = async (
	_,
	data,
	{ decodedToken, verified, authenticated }
) => {
	enforceVerification({ authenticated, verified })

	await validators.updateAccount.validateAsync(data)

	return User.findOneAndUpdate(
		{ _id: decodedToken.uid },
		{ ...data },
		{
			upsert: true,
			new: true
		}
	)
}

const getAccount = async (_, _2, { decodedToken }) => {
	const user = await firebase.auth().getUser(decodedToken.uid)
	if (!user) return NotFoundError('A user with this id was not found')

	return User.findOne({ _id: decodedToken.uid })
}

module.exports = {
	mutations: {
		account: updateAccount
	},
	queries: {
		account: getAccount
	},
	nested: {}
}
