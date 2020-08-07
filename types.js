const { gql } = require('apollo-server-express')

module.exports = gql`
	type Query {
		hello: String!
		users(limit: Int): [User!]!
	}
	type User {
		id: ID!
		displayName: String
	}
	type Mutation {
		createUser(displayName: String!): User!
	}
`
