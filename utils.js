const admin = require('firebase-admin')
const { AuthenticationError } = require('apollo-server-express')

const verifyToken = async token =>
	admin.auth().verifyIdToken(token.replace('Bearer ', ''), true)

const getUser = async uid => {
	try {
		return await admin.auth().getUser(uid)
	} catch (err) {
		return null
	}
}

/**
 *
 * @param {uid} resourceId
 * @param {context} param1
 */
const isAuthorized = async (resourceId, user) =>
	user.emailVerified && resourceId === user.uid

const enforceVerification = ({ authenticated, verified }) => {
	if (!authenticated || !verified) {
		throw new AuthenticationError(
			'[Auth] You must be registered and verified to do this.'
		)
	}
}

module.exports = {
	getUser,
	verifyToken,
	isAuthorized,
	enforceVerification
}
