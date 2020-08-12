const admin = require('firebase-admin')

const verifyToken = async token => {
	return await admin.auth().verifyIdToken(token.replace('Bearer ', ''), true)
}

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
const isAuthorized = async (resourceId, user) => {
	return user.emailVerified && resourceId === user.uid
}

module.exports = {
	getUser,
	verifyToken,
	isAuthorized
}
