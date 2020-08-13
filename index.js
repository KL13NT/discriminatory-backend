const express = require('express')
const mongoose = require('mongoose')
const admin = require('firebase-admin')
const { readFileSync } = require('fs')
const { resolve } = require('path')
const { ValidationError } = require('@hapi/joi')
const { verifyToken } = require('./utils')
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
const types = readSDL('./types.graphql')
const queries = readSDL('./queries.graphql')
const typeDefs = `${types}\n${queries}`

const config = {
	port: 3000,
	databaseURL: 'https://discriminatory-17437.firebaseio.com',
	credential: admin.credential.cert(require('./admin.firebase.json'))
}

admin.initializeApp(config)

const startServer = async () => {
	const app = express()

	const server = new ApolloServer({
		typeDefs,
		resolvers,
		context: async ({ req }) => {
			const token = req.headers.authorization || ''

			try {
				const decodedToken = await verifyToken(token)
				const authenticated = decodedToken ? true : false

				return {
					token,
					decodedToken,
					authenticated,
					verified: decodedToken.email_verified
				}
			} catch (error) {
				return {
					token
				}
			}
		},
		formatError: err => {
			const { originalError } = err

			if (originalError instanceof ValidationError) {
				return new UserInputError(`[Validation] ${originalError.message}`, {
					...originalError.details[0]
				})
			} else if (
				originalError.errorInfo &&
				originalError.errorInfo.code.startsWith('auth')
			) {
				return new AuthenticationError(`[Auth] ${err.message}`)
			}
			return err
		}
	})

	server.applyMiddleware({ app })

	await mongoose.connect('mongodb://localhost:27017/discriminatory', {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	})

	app.listen({ port: config.port }, () =>
		console.log(
			`🚀 Server ready at http://localhost:${config.port}${server.graphqlPath}`
		)
	)
}

startServer()
