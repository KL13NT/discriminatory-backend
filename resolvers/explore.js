// /* eslint-disable no-return-await */
const Joi = require('@hapi/joi')
const { Types, isValidObjectId } = require('mongoose')
const { ValidationError } = require('apollo-server-express')

const Post = require('../models/Post')

const { FEED_LIMIT_MAX } = require('../constants')
const { ID } = require('../types.joi.js')

const validators = {
	feed: Joi.object({
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
		data.before === null ? {} : { _id: { $lt: Types.ObjectId(data.before) } }

	return Post.find(query)
		.limit(FEED_LIMIT_MAX)
		.sort('-_id')
		.lean()
		.exec()
}

const { nested } = require('./feed')

module.exports = {
	mutations: {},
	queries: {
		explore
	},
	nested
}

// const explore = async (_, data) => {
// 	await validators.feed.validateAsync(data)

// 	const query =
// 		data.before === null ? {} : { _id: { $lt: Types.ObjectId(data.before) } }

// 	const posts = await Post.find(query)
// 		.lean()
// 		.limit(FEED_LIMIT_MAX)
// 		.sort('-_id')
// 		.exec()

// 	const full = posts.map(async post => {
// 		const postAuthor = await nested.Post.author(post)
// 		const postLocation = await nested.Post.location(post)
// 		const postComments = (await nested.Post.comments(post)).map(
// 			async comment => {
// 				const commentAuthor = await nested.Comment.author(comment)
// 				return { ...comment, author: commentAuthor }
// 			}
// 		)

// 		return {
// 			...post,
// 			author: postAuthor,
// 			comments: await Promise.all(postComments),
// 			location: postLocation
// 		}
// 	})

// 	return Promise.all(full)
// }
