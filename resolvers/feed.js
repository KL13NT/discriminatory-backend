/* eslint-disable no-return-await */

const Joi = require('@hapi/joi')
const { Types, isValidObjectId } = require('mongoose')
const { ValidationError } = require('apollo-server-express')
const Post = require('../models/Post')
const { enforceVerification } = require('../utils')

const { FEED_LIMIT_MAX } = require('../constants')

const Follow = require('../models/Follow')

const validators = {
	feed: Joi.object({
		limit: Joi.number()
			.min(5)
			.max(20)
			.required(),

		before: Joi.string()
			.trim()
			.min(1)
			.max(12)
			.default('now')
	})
}

const feed = async (_, data, { decodedToken, authenticated, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.feed.validateAsync(data)

	if (data.before !== 'now' && !isValidObjectId(data.before))
		return ValidationError('[User Input] ObjectID is invalid')

	const follows = await Follow.find({ author: decodedToken.uid })

	const authorQuery = {
		author: {
			$in: follows
		}
	}
	const query =
		data.before === 'now'
			? authorQuery
			: { ...authorQuery, _id: { $lte: Types.ObjectId(data.before) } }

	const posts = await Post.find(query)
		.limit(FEED_LIMIT_MAX)
		.sort('-created')

	return posts
}

module.exports = {
	feed
}
