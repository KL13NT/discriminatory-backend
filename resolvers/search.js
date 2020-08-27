/* eslint-disable no-return-await */
const Joi = require('@hapi/joi')
const { Types } = require('mongoose')

const Post = require('../models/Post')
const Location = require('../models/Location')

const { FEED_LIMIT_MAX, LOCATION_MAX } = require('../constants')
const { enforceVerification } = require('../utils')

const validators = {
	search: Joi.object({
		query: Joi.string()
			.trim()
			.min(4)
			.max(LOCATION_MAX)
			.required()
	})
}

const EXCLUDES_REG = /(-\w+)/

const pipeline = string =>
	string
		.replace(/\s+/g, '|')
		.replace(/\|?(-\w+)\|?/g, '|')
		.split('|')
		.map(keyword => keyword.replace(/\W+/g, ''))
		.filter(keyword => keyword.length > 0)

const getMongoQueryFromString = string => {
	const cleaned = string.replace(/\s+/, ' ') // then parse

	const excluded = cleaned.match(EXCLUDES_REG)
	const keywords = pipeline(cleaned)

	const [, ...excludes] = excluded || []

	const query = `${excludes.join(' ')} ${keywords.join(' ')}`

	return query
}

const getRelevantLocations = query =>
	Location.find(
		{
			$text: { $search: query }
		},
		{ score: { $meta: 'textScore' } }
	).sort({ score: { $meta: 'textScore' }, reputation: -1 })

const search = async (_, data, ctx) => {
	enforceVerification(ctx)

	await validators.search.validateAsync(data)

	const parsedQuery = getMongoQueryFromString(data.query)

	const query = getRelevantLocations(parsedQuery)

	const locations = (
		await query
			.limit(FEED_LIMIT_MAX)
			.lean()
			.exec()
	).map(loc => loc._id)

	return Post.find({
		location: {
			$in: locations
		}
	})
		.limit(FEED_LIMIT_MAX)
		.sort('-_id')
		.exec()
}

const { nested } = require('./feed')

module.exports = {
	mutations: {},
	queries: {
		search
	},
	nested
}
