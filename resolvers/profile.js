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
const { isAuthorized, getUser } = require('../utils')

const validators = {
	updateProfile: Joi.object({
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

		id: Joi.string()
			.required()
			.min(ID_MIN)
			.max(ID_MAX),

		email: Joi.string()
			.email()
			.required()
	})
}

const updateProfile = async (_, data, { decodedToken, authenticated }) => {
	if (!authenticated)
		return new AuthenticationError(
			'[Auth] You need to be registered to do this'
		)

	if (!(await isAuthorized(data.id, await getUser(decodedToken.uid))))
		return new ForbiddenError(
			'[Forbidden] You can not modify this resource. You may not have sufficient permissions or your email is not verified.'
		)

	await validators.updateProfile.validateAsync(data)

	return await User.findOneAndUpdate(
		{ _id: data.id },
		{ ...data, _id: data.id },
		{
			upsert: true
		}
	)
}

const getProfile = async (_, { id: _id }) => {
	const validator = Joi.object({
		id: Joi.string()
			.min(1)
			.max(128)
	})

	await validator.validateAsync({ id: _id })

	const user = await firebase.auth().getUser(_id)
	if (!user) throw Error('A user with this id was not found')

	return await User.findOne({ _id })
}

module.exports = {
	mutations: {
		profile: updateProfile
	},
	queries: {
		profile: getProfile
	}
}
