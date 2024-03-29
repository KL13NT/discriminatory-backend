const profile = require('./resolvers/profile')
const account = require('./resolvers/account')
const post = require('./resolvers/post')
const follow = require('./resolvers/follow')
const feed = require('./resolvers/feed')
const explore = require('./resolvers/explore')
const search = require('./resolvers/search')

module.exports = {
	Mutation: {
		...profile.mutations,
		...follow.mutations,
		...feed.mutations,
		...explore.mutations,
		...post.mutations,
		...account.mutations,
		...search.mutations
	},
	Query: {
		...profile.queries,
		...follow.queries,
		...feed.queries,
		...explore.queries,
		...post.queries,
		...account.queries,
		...search.queries
	},
	...profile.nested,
	...post.nested,
	...follow.nested,
	...feed.nested,
	...explore.nested,
	...account.nested,
	...search.nested
}
