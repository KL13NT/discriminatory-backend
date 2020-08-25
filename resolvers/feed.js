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
const {
	enforceVerification,
	getAvatarUrlFromCache,
	getUser
} = require('../utils')
const { ID } = require('../types.joi.js')

const validators = {
	feed: Joi.object({
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

	const follows = (
		await Follow.find({ author: decodedToken.uid })
			.lean()
			.exec()
	).map(follow => follow.following)

	const authorQuery = {
		author: {
			$in: [...follows, decodedToken.uid]
		}
	}

	const query =
		data.before === null
			? authorQuery
			: { ...authorQuery, _id: { $lt: data.before } }

	return Post.find(query)
		.lean()
		.limit(FEED_LIMIT_MAX)
		.sort('-_id')
		.exec()
}

/**
 * Nested resolvers
 * @param {object} parent
 */

// TODO: cache authors until the request is finished
process.authorsCache = {} // TODO: replace this with actual caching backed by Redis for instance
process.usersCache = {} // TODO: replace this with actual caching backed by Redis for instance
const author = async parent => {
	const acc =
		process.authorsCache[parent.author] ||
		(await User.findOne({
			_id: parent.author
		})
			.lean()
			.exec())

	const user = process.usersCache[acc._id] || (await getUser(acc._id))

	process.usersCache[acc._id] = user

	return {
		...acc,
		avatar: await getAvatarUrlFromCache(acc._id),
		verified: user.emailVerified
	}
}

const comments = async ({ _id }) =>
	Comment.find({ post: _id })
		.limit(10)
		.lean()
		.sort('-_id')
		.exec()

const reactions = async ({ _id: post }, _, { decodedToken }) => {
	const upvotes = await Reaction.find({
		post,
		reaction: 'UPVOTE'
	})
		.countDocuments()
		.lean()
		.exec()

	const downvotes = await Reaction.find({
		post,
		reaction: 'DOWNVOTE'
	})
		.countDocuments()
		.lean()
		.exec()

	const reaction = decodedToken
		? await Reaction.findOne({
				author: decodedToken.uid,
				post
		  })
				.lean()
				.exec()
		: null

	return {
		upvotes,
		downvotes,
		reaction: reaction ? reaction.reaction : null
	}
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
		},
		Comment: {
			author
		}
	}
}
