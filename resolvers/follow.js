/* eslint-disable no-return-await */

const Joi = require('@hapi/joi')
const Follow = require('../models/Follow')
const { enforceVerification } = require('../utils')

const { MEMBER_FOLLOW_LIMIT } = require('../constants')

const { NotFoundError, AccountLimit } = require('../errors')
const User = require('../models/User')

const IDValidator = Joi.string()
	.trim()
	.min(1)
	.required()

const validators = {
	follow: Joi.object({
		member: IDValidator
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

	const count = await Follow.find({ author: decodedToken.uid }).count()

	if (count > MEMBER_FOLLOW_LIMIT)
		return new AccountLimit(
			'[Account Limit] You exceeded the maximum number of allowed follows'
		)

	const user = User.findOne({ _id: data.member })

	if (!user) return NotFoundError('[Not Found] User not found')

	return await Follow.create({
		author: decodedToken.uid,
		following: data.member,
		created: Date.now()
	})
}

module.exports = {
	follow,
	unfollow
}
