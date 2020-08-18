const express = require('express')
const mongoose = require('mongoose')
const admin = require('firebase-admin')
const depthLimit = require('graphql-depth-limit')
const { ApolloServer } = require('apollo-server-express')

const firebaseCreds = require('./admin.firebase.json')
const limitLimit = require('./validation/limitLimit')

const resolvers = require('./resolvers')
const {
	readSDL,
	createApolloContext: context,
	formatError
} = require('./utils')

const types = readSDL('./types.graphql')
const queries = readSDL('./queries.graphql')
const typeDefs = `${types}\n${queries}`

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
		context,
		formatError,
		validationRules: [depthLimit(3), limitLimit(20)]
	})

	server.applyMiddleware({ app })

	await mongoose.connect('mongodb://localhost:27017/discriminatory', {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
		useCreateIndex: true
	})

	app.listen({ port: config.port }, () =>
		// eslint-disable-next-line no-console
		console.log(
			`🚀 Server ready at http://localhost:${config.port}${server.graphqlPath}`
		)
	)
}

startServer()
