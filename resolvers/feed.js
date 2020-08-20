/* eslint-disable no-return-await */
const Joi = require('@hapi/joi')
const { Types, isValidObjectId } = require('mongoose')
const { ValidationError } = require('apollo-server-express')

const { storage } = require('firebase-admin')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const User = require('../models/User')
const Reaction = require('../models/Reaction')
const Comment = require('../models/Comment')

const { FEED_LIMIT_MAX } = require('../constants')
const { enforceVerification, getAvatarUrlFromCache } = require('../utils')
const { ID } = require('../types.joi.js')

const { get, set } = require('../redis')

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
const author = async (parent, _, { decodedToken }) => {
	const acc = await User.findOne({
		_id: parent.author
	}).exec()

	return {
		...(await acc.toObject()),
		avatar: await getAvatarUrlFromCache(decodedToken.uid)
	}
}
const comments = async ({ _id }) => Comment.find({ post: _id }).limit(10)
const reactions = async ({ _id: post }, _, { decodedToken }) => {
	const upvotes = await Reaction.find({
		post,
		reaction: 'UPVOTE'
	}).countDocuments()

	const downvotes = await Reaction.find({
		post,
		reaction: 'DOWNVOTE'
	}).countDocuments()

	const reaction = await Reaction.findOne({
		author: decodedToken.uid,
		post
	}).exec()

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
