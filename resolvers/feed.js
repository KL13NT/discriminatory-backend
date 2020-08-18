/* eslint-disable no-return-await */

const Joi = require('@hapi/joi')
const { Types, isValidObjectId } = require('mongoose')
const { ValidationError } = require('apollo-server-express')

const Post = require('../models/Post')
const Follow = require('../models/Follow')
const User = require('../models/User')
const Reaction = require('../models/Reaction')
const Comment = require('../models/Comment')

const { FEED_LIMIT_MAX } = require('../constants')
const { enforceVerification } = require('../utils')
const { ID } = require('../types.joi.js')

const validators = {
	feed: Joi.object({
		limit: Joi.number()
			.min(5)
			.max(20)
			.required(),

		before: ID.allow(null)
	})
}

/**
 * Base resolvers
 */

const feed = async (_, data, { decodedToken, authenticated, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.feed.validateAsync(data)

	if (data.before !== null && !isValidObjectId(data.before))
		return ValidationError('[User Input] Before post ID is invalid')

	const follows = (await Follow.find({ author: decodedToken.uid })).map(
		follow => follow.following
	)

	const authorQuery = {
		author: {
			$in: follows
		}
	}

	const query =
		data.before === null
			? authorQuery
			: { ...authorQuery, _id: { $lte: Types.ObjectId(data.before) } }

	const posts = await Post.find(query)
		.limit(FEED_LIMIT_MAX)
		.sort('-created')

	return posts
}

/**
 * Nested resolvers
 * @param {object} parent
 */

const author = async parent => User.findOne({ _id: parent.author })
const comments = async ({ _id }) => Comment.find({ post: _id }).limit(10)
const reactions = async ({ _id }) => {
	const all = await Reaction.find({ post: _id })

	return all.reduce(
		(total, { reaction }) => {
			if (reaction === 'UPVOTE') return { ...total, upvotes: total.upvotes + 1 }
			if (reaction === 'DOWNVOTE')
				return { ...total, downvotes: total.downvotes + 1 }

			return total
		},
		{ upvotes: 0, downvotes: 0 }
	)
}

module.exports = {
	mutations: {},
	queries: {
		feed
	},
	nested: {
		Post: {
			author,
			reactions,
			comments
		}
	}
}
