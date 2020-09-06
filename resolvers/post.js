/* eslint-disable no-return-await */

const Joi = require('@hapi/joi')
const { AuthenticationError, ApolloError } = require('apollo-server-express')

const Post = require('../models/Post')
const Reaction = require('../models/Reaction')
const Location = require('../models/Location')
const Comment = require('../models/Comment')
// const Report = require('../models/Report')

const { enforceVerification } = require('../utils')
const { ID } = require('../types.joi.js')
const {
	POST_CONTENT_MAX,
	POST_CONTENT_MIN,
	LOCATION_MAX,
	LOCATION_MIN,
	RATE_LIMIT_DUPLICATE,
	RATE_LIMIT_GENERAL,
	FEED_LIMIT_MAX
} = require('../constants')
const {
	// PermissionError,
	// DuplicateError,
	RateLimitError,
	NotFoundError
} = require('../errors')

const validators = {
	getPost: Joi.object({
		member: Joi.string()
			.trim()
			.min(1)
			.required(),

		post: ID.required()
	}),
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

	comments: Joi.object({
		post: ID.required(),
		before: ID.allow(null)
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

	const location = await Location.findOneAndUpdate(
		{
			location: data.location
		},
		{ $inc: { reputation: 1 } },
		{ upsert: true, new: true }
	).exec()

	const post = await Post.create({
		...data,
		created: Date.now(),
		author: decodedToken.uid,
		pinned: false,
		location: location._id
	})

	return post._id
}

const react = async (_, data, { authenticated, decodedToken, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.react.validateAsync(data)

	const post = await Post.find({ _id: data.post }).countDocuments()

	if (!post) return new NotFoundError('[404] Resource not found', 'NOT_FOUND')

	return Reaction.findOneAndUpdate(
		{
			post: data.post,
			author: decodedToken.uid
		},
		{ ...data, author: decodedToken.uid, created: Date.now() },
		{ upsert: true, new: true }
	)
		.lean()
		.exec()
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
	}).exec()

	await Promise.all([
		post.updateOne({ pinned: true }),
		pinned ? pinned.updateOne({ pinned: false }) : null
	])

	return post._id
}

const unpin = async (_, data, ctx) => {
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

	if (!post.pinned)
		return new ApolloError(
			'[NOT APPLICABLE] This post is not pinned',
			'NOT_APPLICABLE'
		)

	return post
		.updateOne({
			pinned: false
		})
		.lean()
		.exec()
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
			post: data.post,
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

const getPost = async (_, { member, post }) => {
	const found = await Post.findOne({ author: member, _id: post })
		.lean()
		.exec()

	if (!found) return NotFoundError('[Not Found] Post was not found')

	return found
}

const comments = async (_, data) => {
	await validators.comments.validateAsync(data)

	return Comment.find({
		post: data.post,
		_id: data.before ? { $lt: data.before } : null
	})
		.limit(5)
		.lean()
		.exec()
}

module.exports = {
	mutations: {
		post: createPost,
		delete: deletePost,
		react,
		pin,
		unpin,
		// report,
		comment
	},
	queries: {
		post: getPost,
		comments
	},
	nested: {}
}
