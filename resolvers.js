const profile = require('./resolvers/profile')
const post = require('./resolvers/post')

module.exports = {
	Mutation: {
		...profile.mutations,
		...post.mutations
	},
	Query: {
		...profile.queries,
		...post.queries
	}
}
