const express = require('express')
const mongoose = require('mongoose')
const admin = require('firebase-admin')
const LRU = require('tiny-lru')
const depthLimit = require('graphql-depth-limit')
const { ApolloServer } = require('apollo-server-express')
const { LongResolver, VoidResolver } = require('graphql-scalars')

const { makeExecutableSchema } = require('graphql-tools')
const { compileQuery, isCompiledQuery } = require('graphql-jit')
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

// Resolvers depend on admin initialized so keep them after initializing
const resolvers = require('./resolvers')

const schema = makeExecutableSchema({
	resolvers: {
		...resolvers,
		Long: LongResolver,
		Void: VoidResolver
	},
	typeDefs
})

const executor = (schema, cacheSize = 1024, compilerOpts = {}) => {
	const cache = LRU(cacheSize)

	return async ({ context, document, operationName, request, queryHash }) => {
		const prefix = operationName || 'NotParametrized'
		const cacheKey = `${prefix}-${queryHash}`
		let compiledQuery = cache.get(cacheKey)

		if (!compiledQuery) {
			const compilationResult = compileQuery(
				schema,
				document,
				operationName || undefined,
				compilerOpts
			)
			if (isCompiledQuery(compilationResult)) {
				compiledQuery = compilationResult
				cache.set(cacheKey, compiledQuery)
			} else {
				return compilationResult
			}
		}

		return compiledQuery.query(undefined, context, request.variables || {})
	}
}

const startServer = async () => {
	const app = express()

	const server = new ApolloServer({
		typeDefs,
		resolvers: {
			...resolvers,
			Long: LongResolver,
			Void: VoidResolver
		},
		context,
		formatError,
		persistedQueries: {
			cache: {}
		},
		skipValidation: true,
		tracing: false,
		executor: executor(schema),
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
			if (Number(last) > RATE_LIMIT_REQ)
				return res.status(429).send('Too many requests')

			await incr(`REQ:${ip}`)
			next()
		} else {
			await set(`REQ:${ip}`, 1)
			await expire(`REQ:${ip}`, 60)
			next()
		}
	})

	app.use(express.json({ limit: '2mb' }))
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
