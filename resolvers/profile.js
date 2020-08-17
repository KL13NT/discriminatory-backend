const Joi = require('@hapi/joi')
const firebase = require('firebase-admin')
const { AuthenticationError, ForbiddenError } = require('apollo-server-express')
const {
	DISPLAYNAME_MAX,
	DISPLAYNAME_MIN,
	ID_MAX,
	ID_MIN,
	TAGLINE_MAX,
	TAGLINE_MIN,
	PROFILE_LOCATION_MAX,
	PROFILE_LOCATION_MIN
} = require('../constants')
const User = require('../models/User')
const { isAuthorized, getUser, enforceVerification } = require('../utils')
const { ID } = require('../custom-joi')

const validators = {
	account: Joi.object({
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

	await validators.account.validateAsync(data)

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
	if (!user) throw Error('A user with this id was not found')

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
