const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const { ApolloServer } = require('apollo-server-express')
const resolvers = require('./resolvers')
const types = require('./types')

const config = { port: 3000 }

const startServer = async () => {
	const app = express()

	const server = new ApolloServer({
		typeDefs: types,
		resolvers
	})

	server.applyMiddleware({ app })

	await mongoose.connect('mongodb://localhost:27017/discriminatory', {
		useNewUrlParser: true,
		useUnifiedTopology: true
	})

	app.listen({ port: config.port }, () =>
		console.log(
			`🚀 Server ready at http://localhost:${config.port}${server.graphqlPath}`
		)
	)
}

startServer()
