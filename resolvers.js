const profile = require('./resolvers/profile')
const account = require('./resolvers/account')
const post = require('./resolvers/post')
const follow = require('./resolvers/follow')
const feed = require('./resolvers/feed')

module.exports = {
	Mutation: {
		...profile.mutations,
		...follow.mutations,
		...feed.mutations,
		...post.mutations,
		...account.mutations
	},
	Query: {
		...profile.queries,
		...follow.queries,
		...feed.queries,
		...post.queries,
		...account.queries
	},
	...profile.nested,
	...post.nested,
	...follow.nested,
	...feed.nested,
	...account.nested
}
