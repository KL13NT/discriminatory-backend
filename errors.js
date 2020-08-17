/* eslint-disable max-classes-per-file */

// TODO: add variables in locales for permission errors
const { ApolloError } = require('apollo-server-express')

/**
 * Used when member doesn't have enough clearance to do a certain mutation/query
 */
class PermissionError extends ApolloError {
	constructor(message) {
		super(message, 'PERMISSION_DENIED')
	}
}

/**
 * Specifies that given resource already exists and can't be duplicated or overriden
 */
class DuplicateError extends ApolloError {
	constructor(message) {
		super(message, 'DUPLICATE_ENTITY')
	}
}

/**
 * If target resource is not found
 */
class NotFoundError extends ApolloError {
	constructor(message) {
		super(message, 'NOT_FOUND')
	}
}

/**
 * Used when member exceeds maximum operations in certain queries
 */
class RateLimitError extends ApolloError {
	constructor(message) {
		super(message, 'RATE_LIMIT')
	}
}

/**
 * Used for limits such as following limit
 */
class AccountLimit extends ApolloError {
	constructor(message) {
		super(message, 'ACCOUNT_LIMIT')
	}
}

module.exports = {
	PermissionError,
	DuplicateError,
	NotFoundError,
	RateLimitError,
	AccountLimit
}
