/* eslint-disable no-return-await */
const Joi = require('@hapi/joi')

const { isValidObjectId } = require('mongoose')
const User = require('../models/User')
const Follow = require('../models/Follow')

const { MEMBER_FOLLOW_LIMIT } = require('../constants')
const { ID } = require('../types.joi.js')
const { enforceVerification } = require('../utils')
const { NotFoundError, AccountLimit } = require('../errors')

const validators = {
	follow: Joi.object({
		member: Joi.string()
			.min(1)
			.max(128)
			.required()
	})
}

const unfollow = async (_, data, { decodedToken, authenticated, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.follow.validateAsync(data)

	if (!(await User.exists({ _id: data.member })))
		return new NotFoundError('[Not Found] User not found')

	const follow = await Follow.findOne({
		author: decodedToken.uid,
		following: data.member
	}).exec()

	if (!follow)
		return new NotFoundError("[Not Found] You're not following this member")

	return follow.deleteOne()
}

const follow = async (_, data, { decodedToken, authenticated, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.follow.validateAsync(data)

	const count = await Follow.find({ author: decodedToken.uid })
		.countDocuments()
		.lean()
		.exec()

	if (count > MEMBER_FOLLOW_LIMIT)
		return new AccountLimit(
			'[Account Limit] You exceeded the maximum number of allowed follows'
		)

	if (!(await User.exists({ _id: data.member })))
		return new NotFoundError('[Not Found] User not found')

	return Follow.create({
		author: decodedToken.uid,
		following: data.member,
		created: Date.now()
	})
}

module.exports = {
	mutations: {
		follow,
		unfollow
	},
	queries: {},
	nested: {}
}
