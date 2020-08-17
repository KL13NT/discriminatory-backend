/* eslint-disable no-return-await */

const Joi = require('@hapi/joi')

const User = require('../models/User')
const Follow = require('../models/Follow')

const { ID } = require('../custom-joi')
const { enforceVerification } = require('../utils')

const { MEMBER_FOLLOW_LIMIT } = require('../constants')
const { NotFoundError, AccountLimit } = require('../errors')

const validators = {
	follow: Joi.object({
		member: ID
	})
}

const unfollow = async (_, data, { decodedToken, authenticated, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.follow.validateAsync(data)

	const user = User.findOne({ _id: data.member })
	if (!user) return NotFoundError('[Not Found] User not found')

	const follow = await Follow.findOne({
		author: decodedToken.uid,
		following: data.member
	})

	if (!follow)
		return NotFoundError("[Not Found] You're not following this member")

	return follow.deleteOne()
}

const follow = async (_, data, { decodedToken, authenticated, verified }) => {
	enforceVerification({ authenticated, verified })

	await validators.follow.validateAsync(data)

	const count = await Follow.find({ author: decodedToken.uid }).countDocuments()

	if (count > MEMBER_FOLLOW_LIMIT)
		return new AccountLimit(
			'[Account Limit] You exceeded the maximum number of allowed follows'
		)

	const user = User.findOne({ _id: data.member })

	if (!user) return NotFoundError('[Not Found] User not found')

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
