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
			.trim()
			.min(DISPLAYNAME_MIN)
			.max(DISPLAYNAME_MAX)
			.required(),

		location: Joi.string()
			.min(PROFILE_LOCATION_MIN)
			.max(PROFILE_LOCATION_MAX)
			.required(),

		tagline: Joi.string()
			.min(TAGLINE_MIN)
			.max(TAGLINE_MAX)
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
		{ ...data, email: decodedToken.email },
		{
			upsert: true,
			new: true
		}
	)
		.lean()
		.exec()
}

const getAccount = async (_, _2, { decodedToken, authenticated, verified }) => {
	const user = await firebase.auth().getUser(decodedToken.uid)
	if (!user) return new NotFoundError('A user with this id was not found')

	const account = await User.findById(decodedToken.uid)
		.lean()
		.exec()

	if (!account) return new NotFoundError('[Not Found]')

	if (!authenticated) return account

	const url = await getAvatarUrlFromCache(decodedToken.uid)

	// TODO: move caching logic to updateAccount instead
	if (!url) return account

	return {
		...account,
		avatar: url,
		verified
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
