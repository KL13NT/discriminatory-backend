/* eslint-disable max-classes-per-file */

// TODO: add variables in locales for permission errors
const { ApolloError } = require('apollo-server-express')

class PermissionError extends ApolloError {
	constructor(message) {
		super(message, 'PERMISSION_DENIED')
	}
}

class DuplicateError extends ApolloError {
	constructor(message) {
		super(message, 'DUPLICATE_ENTITY')
	}
}

class NotFoundError extends ApolloError {
	constructor(message) {
		super(message, 'NOT_FOUND')
	}
}

class RateLimitError extends ApolloError {
	constructor(message) {
		super(message, 'RATE_LIMIT')
	}
}

module.exports = {
	PermissionError,
	DuplicateError,
	NotFoundError,
	RateLimitError
}
