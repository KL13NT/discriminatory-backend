/**
 * Profile getters when visiting /user_id
 */

const Joi = require('@hapi/joi')
const { ID } = require('../types.joi')

const { enforceVerification } = require('../utils')
const User = require('../models/User')
const { NotFoundError } = require('../errors')
const Post = require('../models/Post')

const validators = {
	profile: Joi.object({
		member: ID.required(),
		before: ID
	})
}

const profile = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.profile.validateAsync(data)

	const user = await User.findOne({ _id: data.member }).exec()

	if (!user) return NotFoundError('[Not Found] This account does not exist')

	const pinned = user.pinned
		? await Post.findOne({ _id: user.pinned }).exec()
		: null

	const posts = await Post.find({ author: user._id }).exec()

	if (pinned) posts.unshift(pinned)

	return {
		user,
		posts
	}
}

const { nested } = require('./feed')

module.exports = {
	mutations: {},
	queries: {
		profile
	},
	nested
}
