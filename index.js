const express = require('express')
const mongoose = require('mongoose')
const admin = require('firebase-admin')
const depthLimit = require('graphql-depth-limit')
const { json } = require('express')
const { ApolloServer } = require('apollo-server-express')
const { LongResolver } = require('graphql-scalars')

const firebaseCreds = require('./admin.firebase.json')

const { RateLimitError } = require('./errors')

const {
	readSDL,
	formatError,
	createApolloContext: context
} = require('./utils')
const { set, get, incr, expire } = require('./redis')
const { RATE_LIMIT_REQ } = require('./constants')

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
		validationRules: [depthLimit(5)]
	})

	app.use(async (req, res, next) => {
		const forwarded = req.headers['x-forwarded-for']
		const ip =
			(Array.isArray(forwarded) ? forwarded.shift() : forwarded || '')
				.split(',')
				.pop()
				.trim() ||
			req.connection.remoteAddress ||
			req.socket.remoteAddress ||
			req.connection.socket.remoteAddress

		const last = await get(`REQ:${ip}`)
		if (last) {
			await incr(`REQ:${ip}`)

			if (Number(last) > RATE_LIMIT_REQ)
				return new RateLimitError('[Rate Limit] Whoa, slow down')
		} else {
			await set(`REQ:${ip}`, 1)
			await expire(`REQ:${ip}`, 60)
		}

		next()
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
