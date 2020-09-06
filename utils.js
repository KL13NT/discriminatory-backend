const { readFileSync } = require('fs')
const { resolve } = require('path')

const admin = require('firebase-admin')
const {
	AuthenticationError,
	ValidationError,
	UserInputError
} = require('apollo-server-express')

const LRU = require('tiny-lru')
const { RATE_LIMIT_BASE } = require('./constants')

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
const users = LRU(1000)
const getUser = async uid => {
	try {
		const user = users.get(uid) || (await admin.auth().getUser(uid))

		if (user) users.set(uid, user)

		return user
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
const tokens = LRU(1024, 60 * 60 * 1000 /* 1 hour */)
const createApolloContext = async ({ req }) => {
	const token = (req.headers.authorization || '').replace('Bearer ', '')

	if (!token) return {}

	try {
		const cached = tokens.get(token)

		if (cached) {
			return {
				token,
				decodedToken: cached,
				authenticated: true,
				verified: true
			}
		}

		const decodedToken = await verifyToken(token)
		const authenticated = Boolean(decodedToken)

		if (decodedToken.email_verified) tokens.set(token, decodedToken)

		return {
			token,
			decodedToken,
			authenticated,
			verified: decodedToken.email_verified
		}
	} catch (error) {
		console.log(error)
		return {}
	}
}

const shouldLimit = last =>
	new Date(last) >= new Date(Date.now() - RATE_LIMIT_BASE)

const formatError = err => {
	const error = err.originalError || err
	// eslint-disable-next-line no-console
	console.log('error: ', error)

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
const avatars = LRU(1024, 7 * 24 * 60 * 60 * 1000 /* 7 days */)
const getAvatarUrlFromCache = async uid => {
	const cached = avatars.get(uid)

	if (cached) return cached

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

	avatars.set(uid, url)

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
	shouldLimit,
	getAvatarUrlFromCache
}
