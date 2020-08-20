/* eslint-disable no-return-await */
const Joi = require('@hapi/joi')
const { Types, isValidObjectId } = require('mongoose')
const { ValidationError } = require('apollo-server-express')

const Post = require('../models/Post')
const Follow = require('../models/Follow')
const User = require('../models/User')
const Reaction = require('../models/Reaction')

const { FEED_LIMIT_MAX } = require('../constants')
const { enforceVerification, getAvatarUrlFromCache } = require('../utils')
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

/**
 * Nested resolvers
 * @param {object} parent
 */

const author = async (parent, _, { decodedToken }) => {
	const acc = await User.findOne({
		_id: parent.author
	}).exec()

	return {
		...(await acc.toObject()),
		avatar: await getAvatarUrlFromCache(decodedToken.uid)
	}
}
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
		explore
	},
	nested: {
		UnregisteredPost: {
			author,
			reactions
		}
	}
}
