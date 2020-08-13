/* eslint-disable no-return-await */

const { AuthenticationError } = require('apollo-server-express')
const Joi = require('@hapi/joi')
const Post = require('../models/Post')
const Reaction = require('../models/Reaction')
const User = require('../models/User')
const Report = require('../models/Report')
const Comment = require('../models/Comment')

const {
	POST_CONTENT_MAX,
	POST_CONTENT_MIN,
	LOCATION_MAX,
	LOCATION_MIN,
	RATE_LIMIT_DUPLICATE,
	RATE_LIMIT_GENERAL
} = require('../constants')

const {
	PermissionError,
	DuplicateError,
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
		post: Joi.string()
			.trim()
			.min(1)
			.required(),

		reaction: Joi.string()
			.trim()
			.valid('UPVOTE', 'DOWNVOTE')
			.required()
	}),

	deleteOrPin: Joi.object({
		post: Joi.string()
			.trim()
			.min(1)
			.required()
	}),

	report: Joi.object({
		post: Joi.string()
			.trim()
			.min(1)
			.required(),

		reason: Joi.string()
			.trim()
			.valid('GUIDELINES_VIOLATION')
			.default('GUIDELINES_VIOLATION')
	}),

	comment: Joi.object({
		post: Joi.string()
			.trim()
			.min(1)
			.required(),

		content: Joi.string()
			.trim()
			.min(1)
			.max(160)
			.required()
	})
}

const enforceVerification = ({ authenticated, verified }) => {
	if (!authenticated || !verified) {
		throw new AuthenticationError(
			'[Auth] You must be registered and verified to do this.'
		)
	}
}

const createPost = async (
	_,
	data,
	{ decodedToken, authenticated, verified }
) => {
	enforceVerification({ authenticated, verified })

	await validators.createPost.validateAsync(data)

	if (
		await Post.findOne({
			author: decodedToken.uid
		}).or([
			{
				created: { $gte: Date.now() - RATE_LIMIT_DUPLICATE }, // duplicate in last hour
				content: data.content
			},
			{ created: { $gte: Date.now() - 60000 } } // in last minute
		])
	) {
		return new RateLimitError(
			'[Rate Limit] You cannot post the same post twice in an hour or post multiple posts in a minute'
		)
	}

	const post = await Post.create({
		...data,
		created: Date.now(),
		author: decodedToken.uid
	})

	return post._id
}

const react = async (_, data, { authenticated, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.react.validateAsync(data)

	const post = await Post.findOne({ _id: data.post })

	if (!post) return new NotFoundError('[404] Resource not found', 'NOT_FOUND')

	const reaction = await Reaction.findOneAndUpdate(
		{
			post: data.post
		},
		{ ...data, author: post.author, created: Date.now() },
		{ upsert: true }
	).exec()

	return reaction._id
}

const deletePost = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.deleteOrPin.validateAsync(data)

	const post = await Post.findOne({
		_id: data.post
	})

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

	await validators.deleteOrPin.validateAsync(data)

	const post = await Post.findOne({
		_id: data.post
	})

	if (!post) return new NotFoundError('[404] Resource not found', 'NOT_FOUND')

	if (post.author !== ctx.decodedToken.uid) {
		return AuthenticationError(
			'[Auth] You do not have permission to pin this post'
		)
	}

	await User.findOneAndUpdate(
		{ _id: ctx.decodedToken.uid },
		{ pinned: post._id }
	)

	return post._id
}

const report = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.report.validateAsync(data)

	const post = await Post.findOne({
		_id: data.post
	})

	if (!post) return new NotFoundError('[404] Resource not found')

	if (post.author === ctx.decodedToken.uid) {
		return new PermissionError('[Permission] You cannot report your own posts')
	}

	if (await Report.findOne({ post: data.post, author: ctx.decodedToken.uid })) {
		return new DuplicateError('[Duplicate] You already reported this post')
	}

	return (
		await Report.create({
			post: post._id,
			author: ctx.decodedToken.uid,
			reason: data.reason
		})
	)._id
}

const comment = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.comment.validateAsync(data)

	const post = await Post.findOne({
		_id: data.post
	})

	if (!post) return new NotFoundError('[404] Resource not found')

	if (
		await Comment.findOne({
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
			post: post._id,
			author: ctx.decodedToken.uid,
			content: data.content,
			create: Date.now()
		})
	)._id
}

module.exports = {
	mutations: {
		post: createPost,
		delete: deletePost,
		react,
		pin,
		report,
		comment
	},
	queries: {}
}
