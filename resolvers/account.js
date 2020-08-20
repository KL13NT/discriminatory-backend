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
const { enforceVerification, getAvatarUrlFromCache } = require('../utils')
const { NotFoundError } = require('../errors')
const { set, get } = require('../redis')

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
	).exec()
}

const getAccount = async (_, _2, { decodedToken, authenticated }) => {
	const user = await firebase.auth().getUser(decodedToken.uid)
	if (!user) return new NotFoundError('A user with this id was not found')

	const account = await User.findById(decodedToken.uid).exec()

	if (!account) return new NotFoundError('[Not Found]')

	if (!authenticated) return account.toObject()

	const url = await getAvatarUrlFromCache(decodedToken.uid)

	// TODO: move caching logic to updateAccount instead
	if (!url) return account.toObject()

	return {
		...(await account.toObject()),
		avatar: url
	}
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
