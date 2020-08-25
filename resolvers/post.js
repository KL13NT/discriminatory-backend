/* eslint-disable no-return-await */

const Joi = require('@hapi/joi')
const { AuthenticationError } = require('apollo-server-express')

const Post = require('../models/Post')
const Reaction = require('../models/Reaction')
const User = require('../models/User')
// const Report = require('../models/Report')
const Comment = require('../models/Comment')

const { enforceVerification } = require('../utils')
const { ID } = require('../types.joi.js')
const {
	POST_CONTENT_MAX,
	POST_CONTENT_MIN,
	LOCATION_MAX,
	LOCATION_MIN,
	RATE_LIMIT_DUPLICATE,
	RATE_LIMIT_GENERAL
} = require('../constants')
const {
	// PermissionError,
	// DuplicateError,
	RateLimitError,
	NotFoundError
} = require('../errors')

const validators = {
	createPost: Joi.object({
		content: Joi.string()
			.trim()
			.min(POST_CONTENT_MIN)
			.max(POST_CONTENT_MAX)
			.required(),

		location: Joi.string()
			.trim()
			.min(LOCATION_MIN)
			.max(LOCATION_MAX)
			.required()
	}),

	react: Joi.object({
		post: ID,

		reaction: Joi.string()
			.trim()
			.valid('UPVOTE', 'DOWNVOTE')
			.required()
	}),

	delete: Joi.object({
		post: ID
	}),

	pin: Joi.object({
		post: ID
	}),

	report: Joi.object({
		post: ID,

		reason: Joi.string()
			.trim()
			.valid('GUIDELINES_VIOLATION')
			.default('GUIDELINES_VIOLATION')
	}),

	comment: Joi.object({
		post: ID,

		content: Joi.string()
			.trim()
			.min(1)
			.max(160)
			.required()
	}),

	posts: Joi.object({
		limit: Joi.number()
			.min(5)
			.max(20)
			.required(),

		member: ID,

		before: Joi.date().required()
	})
}

const createPost = async (
	_,
	data,
	{ decodedToken, authenticated, verified }
) => {
	enforceVerification({ authenticated, verified })

	await validators.createPost.validateAsync(data)

	if (
		await Post.exists({
			author: decodedToken.uid,
			$or: [
				{
					created: { $gte: Date.now() - RATE_LIMIT_DUPLICATE }, // duplicate in last hour
					content: data.content
				},
				{ created: { $gte: Date.now() - RATE_LIMIT_GENERAL } } // in last minute
			]
		})
	)
		return new RateLimitError(
			'[Rate Limit] You cannot post the same post twice in an hour or post multiple posts in a minute'
		)

	const post = await Post.create({
		...data,
		created: Date.now(),
		author: decodedToken.uid,
		pinned: false
	})

	return post._id
}

const react = async (_, data, { authenticated, decodedToken, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.react.validateAsync(data)

	const post = await Post.findOne({ _id: data.post })
		.lean()
		.exec()

	if (!post) return new NotFoundError('[404] Resource not found', 'NOT_FOUND')

	const reaction = await Reaction.findOneAndUpdate(
		{
			post: data.post
		},
		{ ...data, author: decodedToken.uid, created: Date.now() },
		{ upsert: true, new: true }
	)
		.lean()
		.exec()

	return reaction
}

const deletePost = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.delete.validateAsync(data)

	const post = await Post.findOne({
		_id: data.post
	}).exec()

	if (!post) return new NotFoundError('[404] Resource not found', 'NOT_FOUND')

	if (post.author !== ctx.decodedToken.uid) {
		return AuthenticationError(
			'[Auth] You do not have permission to modify this resource'
		)
	}

	await post.deleteOne()

	return post._id
}

const pin = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.pin.validateAsync(data)

	const post = await Post.findOne({
		author: ctx.decodedToken.uid,
		_id: data.post
	}).exec()

	if (!post) return new NotFoundError('[404] Resource not found', 'NOT_FOUND')

	if (post.author !== ctx.decodedToken.uid) {
		return AuthenticationError(
			'[Auth] You do not have permission to pin this post'
		)
	}

	const pinned = await Post.findOne({
		author: ctx.decodedToken.uid,
		pinned: true
	})
		.lean()
		.exec()

	await Promise.all([
		post.updateOne({ pinned: true }),
		pinned ? pinned.updateOne({ pinned: false }) : null
	])

	return post._id
}

// const report = async (_, data, ctx) => {
// 	enforceVerification(ctx)

// 	await validators.report.validateAsync(data)

// 	const post = await Post.findOne({
// 		_id: data.post
// 	})

// 	if (!post) return new NotFoundError('[404] Resource not found')

// 	if (post.author === ctx.decodedToken.uid) {
// 		return new PermissionError('[Permission] You cannot report your own posts')
// 	}

// 	if (await Report.findOne({ post: data.post, author: ctx.decodedToken.uid })) {
// 		return new DuplicateError('[Duplicate] You already reported this post')
// 	}

// 	return (
// 		await Report.create({
// 			post: post._id,
// 			author: ctx.decodedToken.uid,
// 			reason: data.reason
// 		})
// 	)._id
// }

const comment = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.comment.validateAsync(data)

	if (
		!(await Post.exists({
			_id: data.post
		}))
	)
		return new NotFoundError('[404] Resource not found')

	if (
		await Comment.exists({
			author: ctx.decodedToken.uid,
			created: { $gte: Date.now() - RATE_LIMIT_GENERAL }
		})
	) {
		return new RateLimitError(
			'[Rate Limit] You cannot comments twice in a single minute. Give others a chance!'
		)
	}

	return (
		await Comment.create({
			post: data.post,
			author: ctx.decodedToken.uid,
			content: data.content,
			created: Date.now()
		})
	)._id
}

const { nested } = require('./feed')

const getPosts = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.profile.validateAsync(data)

	const user = await User.findOne({ _id: data.member })
		.lean()
		.exec()

	if (!user) return new NotFoundError('[Not Found] This account does not exist')

	const query = { author: user._id }
	const beforeQuery = {
		_id: { $lt: data.before },
		author: user._id
	}
	const pinnedQuery = { author: user._id, pinned: true }
}

module.exports = {
	mutations: {
		post: createPost,
		delete: deletePost,
		react,
		pin,
		// report,
		comment
	},
	queries: {
		// posts: getPosts
	},
	nested: {}
}
