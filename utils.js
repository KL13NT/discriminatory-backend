const { readFileSync } = require('fs')
const { resolve } = require('path')

const admin = require('firebase-admin')
const {
	AuthenticationError,
	ValidationError,
	UserInputError
} = require('apollo-server-express')

const { set, get } = require('./redis')
const { RATE_LIMIT_BASE } = require('./constants')
const { RateLimitError } = require('./errors')

/**
 * @param {string} token
 * @returns Decoded Token
 */
const verifyToken = async token =>
	admin.auth().verifyIdToken(token.replace('Bearer ', ''), true)

/**
 * @param {string} uid
 * @returns firebase.auth.UserRecord or null
 */
const getUser = async uid => {
	try {
		return admin.auth().getUser(uid)
	} catch (err) {
		return null
	}
}

const isAuthorized = async (resourceOwnerId, user) =>
	resourceOwnerId === user.uid

/**
 * Verifies a user is authenticated & verified
 * @param {context} context
 */
const enforceVerification = ({ authenticated, verified }) => {
	if (!authenticated || !verified) {
		throw new AuthenticationError(
			'[Auth] You must be registered and verified to do this.'
		)
	}
}

/**
 * Returns a proper context for resolvers or throws to stop a request
 * @param {ExpressContext} ExpressContext
 */
const createApolloContext = async ({ req }) => {
	const hrstart = process.hrtime()
	const token = req.headers.authorization || ''

	if (!token) return {}

	try {
		const decodedToken = await verifyToken(token)
		const authenticated = Boolean(decodedToken)

		const lastOp = await get(`OP:${decodedToken.uid}`)
		if (
			lastOp &&
			new Date(Number(lastOp)) >= new Date(Date.now() - RATE_LIMIT_BASE)
		)
			throw new RateLimitError('[Rate Limit] Whoa, slow down')
		else set(`OP:${decodedToken.uid}`, Date.now())

		const end = process.hrtime(hrstart)
		console.log('TOKEN', end[0], end[1] / 1000000)
		return {
			token,
			decodedToken,
			authenticated,
			verified: decodedToken.email_verified
		}
	} catch (error) {
		const end = process.hrtime(hrstart)
		console.log('NO TOKEN', end[0], end[1] / 1000000)
		return {}
	}
}

const formatError = err => {
	const error = err.originalError || err
	// eslint-disable-next-line no-console
	console.log(error)

	if (error instanceof ValidationError) {
		return new UserInputError(`[Validation] ${error.message}`, {
			...error.details[0]
		})
	}
	if (error.errorInfo && error.errorInfo.code.startsWith('auth')) {
		return new AuthenticationError(`[Auth] ${err.message}`)
	}
	return err
}

/**
 *
 * @param {string} path
 */
const readSDL = path =>
	readFileSync(resolve(__dirname, path), {
		encoding: 'utf-8'
	})

/**
 * Controls the cache of image urls
 * @param {String} UID
 */
const getAvatarUrlFromCache = async uid => {
	const cached = String(await get(`AVATAR_URL:${uid}`))
	const created = Number(await get(`AVATAR_CACHED:${uid}`))

	if (cached !== 'null' && created > Date.now() - 86400 * 1000) return cached

	const file = admin
		.storage()
		.bucket()
		.file(`avatars/${uid}_200x200`)

	if (!(await file.exists())[0]) return null

	await file.setMetadata({
		cacheControl: 'private,max-age=86400'
	})

	const [url] = await file.getSignedUrl({
		action: 'read',
		expires: Date.now() + 86400 * 1000
	})

	set(`AVATAR_URL:${uid}`, url)
	set(`AVATAR_CACHED:${uid}`, Date.now())

	return url
}

module.exports = {
	getUser,
	verifyToken,
	isAuthorized,
	enforceVerification,
	readSDL,
	createApolloContext,
	formatError,
	getAvatarUrlFromCache
}
