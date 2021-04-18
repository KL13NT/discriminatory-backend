/**
 * Profile getters when visiting /user_id
 */

const Joi = require('@hapi/joi')
const { ID } = require('../types.joi')

const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')

const { NotFoundError } = require('../errors')
const { enforceVerification, getAvatarUrlFromCache } = require('../utils')

const { nested } = require('./feed')
const { FEED_LIMIT_MAX } = require('../constants')

const validators = {
	profile: Joi.object({
		member: Joi.string()
			.trim()
			.min(1)
			.required(),
		before: ID.allow(null)
	})
}

const profile = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.profile.validateAsync(data)

	const user = await User.findOne({ _id: data.member })
		.lean()
		.exec()

	if (!user) return new NotFoundError('[Not Found] This account does not exist')

	const following = await Follow.findOne({
		author: ctx.decodedToken.uid,
		following: data.member
	})
		.lean()
		.exec()

	const query = { author: user._id }
	if (data.before) query._id = { $lt: data.before }

	if (!data.before) {
		const [posts, postCount] = await Promise.all([
			Post.find(query)
				.limit(FEED_LIMIT_MAX)
				.sort('-_id')
				.sort('-pinned')
				.lean()
				.exec(),

			Post.find({ author: user._id })
				.countDocuments()
				.exec()
		])

		return {
			user: {
				...user,
				avatar: await getAvatarUrlFromCache(user._id),
				verified: ctx.verified
			},
			following: Boolean(following),
			posts,
			postCount
		}
	}

	const [posts] = await Promise.all([
		Post.find(query, { pinned: 0 })
			.limit(FEED_LIMIT_MAX)
			.sort('-_id')
			.lean()
			.exec()
	])

	return {
		user: {
			...user,
			avatar: await getAvatarUrlFromCache(user._id),
			verified: ctx.verified
		},
		posts
	}
}

module.exports = {
	mutations: {},
	queries: {
		profile
	},
	nested
}
