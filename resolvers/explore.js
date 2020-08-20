/* eslint-disable no-return-await */

const Joi = require('@hapi/joi')
const { Types, isValidObjectId } = require('mongoose')
const { ValidationError } = require('apollo-server-express')

const Post = require('../models/Post')
const User = require('../models/User')
const Reaction = require('../models/Reaction')

const { FEED_LIMIT_MAX } = require('../constants')
const { ID } = require('../types.joi.js')

const validators = {
	explore: Joi.object({
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
	await validators.explore.validateAsync(data)

	if (data.before !== null && !isValidObjectId(data.before))
		return ValidationError('[User Input] Before post ID is invalid')

	const query =
		data.before === null ? {} : { _id: { $lte: Types.ObjectId(data.before) } }

	const posts = await Post.find(query)
		.limit(FEED_LIMIT_MAX)
		.exec()

	return posts
}

/**
 * Nested resolvers
 * @param {object} parent
 */

// TODO: cache authors until the request is finished
const author = async parent => User.findOne({ _id: parent.author })
const reactions = async ({ _id }) => {
	const all = await Reaction.find({ post: _id })

	const data = all.reduce(
		(total, { reaction }) => {
			if (reaction === 'UPVOTE') return { ...total, upvotes: total.upvotes + 1 }
			if (reaction === 'DOWNVOTE')
				return { ...total, downvotes: total.downvotes + 1 }

			return total
		},
		{ upvotes: 0, downvotes: 0 }
	)

	return {
		...data
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
