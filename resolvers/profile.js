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

	const user = await User.findOne({ _id: data.member }).exec()

	if (!user) return NotFoundError('[Not Found] This account does not exist')

	const following = await Follow.findOne({
		author: ctx.decodedToken.uid,
		following: data.member
	}).exec()

	const pinned = user.pinned
		? await Post.findOne({ _id: user.pinned }).exec()
		: null

	const posts = await Post.find({ author: user._id }).exec()

	if (pinned) posts.unshift(pinned)

	return {
		user: {
			...(await user.toObject()),
			avatar: await getAvatarUrlFromCache(user._id)
		},
		following: Boolean(following),
		posts
	}
}

module.exports = {
	mutations: {},
	queries: {
		profile
	},
	nested: {
		ProfilePost: {
			comments: nested.Post.comments,
			reactions: nested.Post.reactions
		}
	}
}
