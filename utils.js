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
	const token = req.headers.authorization || ''

	if (!token) return {}

	const decodedToken = await verifyToken(token)
	const authenticated = Boolean(decodedToken)

	const lastOp = await get(`OP:${decodedToken.uid}`)
	if (
		lastOp &&
		new Date(Number(lastOp)) >= new Date(Date.now() - RATE_LIMIT_BASE)
	)
		throw new RateLimitError('[Rate Limit] Whoa, slow down')
	else set(`OP:${decodedToken.uid}`, Date.now())

	return {
		token,
		decodedToken,
		authenticated,
		verified: decodedToken.email_verified
	}
}

const formatError = err => {
	const error = err.originalError || err
	// eslint-disable-next-line no-console
	console.log(error.message, error.code)

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

module.exports = {
	getUser,
	verifyToken,
	isAuthorized,
	enforceVerification,
	readSDL,
	createApolloContext,
	formatError
}
