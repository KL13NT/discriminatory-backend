/* eslint-disable no-return-await */
const Joi = require('@hapi/joi')
const { isValidObjectId } = require('mongoose')
const { ValidationError } = require('apollo-server-express')
const LRU = require('tiny-lru')
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
const Location = require('../models/Location')

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

const authors = LRU(500)
const author = async parent => {
	const acc =
		authors.get(parent.author) ||
		(await User.findOne({
			_id: parent.author
		})
			.lean()
			.exec())

	authors.set(parent.author, acc)

	const user = await getUser(acc._id)

	return {
		...acc,
		avatar: await getAvatarUrlFromCache(acc._id),
		verified: user ? user.emailVerified : null
	}
}

const locations = LRU(500)
const location = async ({ location }) => {
	const found =
		locations.get(location) ||
		(await Location.findOne({ _id: location })
			.lean()
			.exec())

	locations.set(location, found)
	return found
}

// const commentsLRU = LRU(1024)
const comments = async ({ _id }) => {
	const found =
		// commentsLRU.get(_id) ||
		await Comment.find({ post: _id })
			.sort('-_id')
			.limit(5)
			.lean()
			.exec()

	// if (found && found.length > 0) commentsLRU.set(_id, found)
	return found
}

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
			comments,
			location
		},
		Comment: {
			author
		}
	}
}
