const profile = require('./resolvers/profile')
const post = require('./resolvers/post')
const follow = require('./resolvers/follow')
const feed = require('./resolvers/feed')

module.exports = {
	Mutation: {
		...profile.mutations,
		...follow.mutations,
		...feed.mutations,
		...post.mutations
	},
	Query: {
		...profile.queries,
		...follow.queries,
		...feed.queries,
		...post.queries
	},
	...profile.nested,
	...post.nested,
	...follow.nested,
	...feed.nested
}
