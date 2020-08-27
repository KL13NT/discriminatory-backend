const { readFileSync } = require('fs')
const { resolve } = require('path')

const admin = require('firebase-admin')
const {
	AuthenticationError,
	ValidationError,
	UserInputError
} = require('apollo-server-express')

const { set, get, expire } = require('./redis')
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
	const token = req.headers.authorization || ''

	if (!token) return {}

	try {
		const cached = await get(`T:${token}`)

		if (cached) {
			const [uid, email] = await Promise.all([
				get(`T:${token}:UID`),
				get(`T:${token}:EMAIL`)
			])

			return {
				token,
				decodedToken: {
					uid,
					email
				},
				authenticated: true,
				verified: true
			}
		}

		const decodedToken = await verifyToken(token)
		const authenticated = Boolean(decodedToken)

		if (decodedToken.email_verified) {
			await Promise.all([
				set(`T:${token}`, token),
				set(`T:${token}:UID`, decodedToken.uid),
				set(`T:${token}:EMAIL`, decodedToken.email)
			])

			await Promise.all([
				expire(`T:${token}`, 60 * 60 /* 1 hour */),
				expire(`T:${token}:UID`, 60 * 60 /* 1 hour */),
				expire(`T:${token}:EMAIL`, 60 * 60 /* 1 hour */)
			])
		}

		return {
			token,
			decodedToken,
			authenticated,
			verified: decodedToken.email_verified
		}
	} catch (error) {
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
	shouldLimit,
	getAvatarUrlFromCache
}
