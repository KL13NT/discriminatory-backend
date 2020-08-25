const express = require('express')
const mongoose = require('mongoose')
const admin = require('firebase-admin')
const depthLimit = require('graphql-depth-limit')
const { json } = require('express')
const { ApolloServer } = require('apollo-server-express')

const { LongResolver } = require('graphql-scalars')

const firebaseCreds = require('./admin.firebase.json')
const limitLimit = require('./validation/limitLimit')

const {
	readSDL,
	createApolloContext: context,
	formatError
} = require('./utils')

const types = readSDL('./types.graphql')
const queries = readSDL('./queries.graphql')
const typeDefs = `${types}\n${queries}`
const redis = require('./redis') // eslint-disable-line

const config = {
	port: 3000,
	databaseURL: process.env.FIREBASE_DB,
	credential: admin.credential.cert(firebaseCreds),
	storageBucket: process.env.FIREBASE_BUCKET
}

admin.initializeApp(config)

// Resolvers depend on admin initialized so keep them here
const resolvers = require('./resolvers')

const startServer = async () => {
	const app = express()

	const server = new ApolloServer({
		typeDefs,
		resolvers: {
			...resolvers,
			Long: LongResolver
		},
		context,
		formatError,
		persistedQueries: {
			cache: {}
		},
		validationRules: [depthLimit(5), limitLimit(20)]
	})

	app.use(json({ limit: '2mb' }))
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
