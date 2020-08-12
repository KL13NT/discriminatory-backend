const express = require('express')
const mongoose = require('mongoose')
const admin = require('firebase-admin')
const { readFileSync } = require('fs')
const { resolve } = require('path')
const { ApolloServer } = require('apollo-server-express')
const { getUser, verifyToken } = require('./utils')

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
					authenticated
				}
			} catch (error) {
				return {
					token
				}
			}
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
