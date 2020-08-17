const express = require('express')
const mongoose = require('mongoose')
const admin = require('firebase-admin')
const { set, get } = require('./redis') // eslint-disable-line
const depthLimit = require('graphql-depth-limit')

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { ValidationError } = require('@hapi/joi')
const {
	ApolloServer,
	UserInputError,
	AuthenticationError
} = require('apollo-server-express')

const readSDL = path =>
	readFileSync(resolve(__dirname, path), {
		encoding: 'utf-8'
	})

const resolvers = require('./resolvers')
const firebaseCreds = require('./admin.firebase.json')
const limitLimit = require('./validation/limitLimit')

const types = readSDL('./types.graphql')
const queries = readSDL('./queries.graphql')
const typeDefs = `${types}\n${queries}`

const { verifyToken } = require('./utils')
const { RATE_LIMIT_BASE } = require('./constants')
const { RateLimitError } = require('./errors')

const config = {
	port: 3000,
	databaseURL: 'https://discriminatory-17437.firebaseio.com',
	credential: admin.credential.cert(firebaseCreds)
}

admin.initializeApp(config)

const startServer = async () => {
	const app = express()

	const server = new ApolloServer({
		typeDefs,
		resolvers,
		context: async ({ req }) => {
			const token = req.headers.authorization || ''

			if (!token) return {}

			const decodedToken = await verifyToken(token)
			const authenticated = Boolean(decodedToken)

			console.log(authenticated, decodedToken.email_verified)

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
		},
		formatError: err => {
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
		},
		validationRules: [depthLimit(3), limitLimit(20)]
	})

	server.applyMiddleware({ app })

	await mongoose.connect('mongodb://localhost:27017/discriminatory', {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	})

	app.listen({ port: config.port }, () =>
		// eslint-disable-next-line no-console
		console.log(
			`🚀 Server ready at http://localhost:${config.port}${server.graphqlPath}`
		)
	)
}

startServer()
