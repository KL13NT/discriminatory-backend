/* eslint-disable no-return-await */
const Joi = require('@hapi/joi')
const { Types, isValidObjectId } = require('mongoose')
const { ValidationError } = require('apollo-server-express')

const Post = require('../models/Post')

const { FEED_LIMIT_MAX } = require('../constants')
const { ID } = require('../types.joi.js')

const validators = {
	feed: Joi.object({
		before: ID.allow(null)
	})
}

/**
 * Base resolvers
 */

const explore = async (_, data) => {
	await validators.feed.validateAsync(data)

	if (data.before !== null && !isValidObjectId(data.before))
		return ValidationError('[User Input] Before post ID is invalid')

	const query =
		data.before === null ? {} : { _id: { $lte: Types.ObjectId(data.before) } }

	const posts = await Post.find(query)
		.limit(FEED_LIMIT_MAX)
		.sort('-created')

	return posts
}

const { nested } = require('./feed')

module.exports = {
	mutations: {},
	queries: {
		explore
	},
	nested
}
