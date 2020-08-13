const Joi = require('@hapi/joi')
const Post = require('../models/Post')
const {
	POST_CONTENT_MAX,
	POST_CONTENT_MIN,
	LOCATION_MAX,
	LOCATION_MIN
} = require('../constants')
const User = require('../models/User')
const { AuthenticationError } = require('apollo-server-express')
const { Types } = require('mongoose')

const validators = {
	createPost: Joi.object({
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
}

const createPost = async (
	_,
	data,
	{ decodedToken, authenticated, verified }
) => {
	if (!authenticated || !verified)
		return new AuthenticationError(
			'[Auth] You need to be registered to do this or verify your email'
		)

	await validators.createPost.validateAsync(data)

	const post = await Post.create({
		...data,
		created: Date.now(),
		author: decodedToken.uid
	})

	return post._id
}

module.exports = {
	mutations: {
		post: createPost
	},
	queries: {}
}
