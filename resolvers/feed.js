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
const { enforceVerification, getAvatarUrlFromCache } = require('../utils')
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

	const follows = (await Follow.find({ author: decodedToken.uid })).map(
		follow => follow.following
	)

	const authorQuery = {
		author: {
			$in: [...follows, decodedToken.uid]
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

// TODO: cache authors until the request is finished
const authorsCache = {} // TODO: replace this with actual caching backed by Redis for instance
const author = async parent => {
	const acc =
		authorsCache[parent.author] ||
		(await (
			await User.findOne({
				_id: parent.author
			}).exec()
		).toObject())

	authorsCache[parent.author] = acc

	return {
		...acc,
		avatar: await getAvatarUrlFromCache(acc._id)
	}
}

const comments = async ({ _id }) =>
	Comment.find({ post: _id })
		.limit(10)
		.sort('-created')
const reactions = async ({ _id: post }, _, { decodedToken }) => {
	const upvotes = await Reaction.find({
		post,
		reaction: 'UPVOTE'
	}).countDocuments()

	const downvotes = await Reaction.find({
		post,
		reaction: 'DOWNVOTE'
	}).countDocuments()

	const reaction = decodedToken
		? await Reaction.findOne({
				author: decodedToken.uid,
				post
		  }).exec()
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
