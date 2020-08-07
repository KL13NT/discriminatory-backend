const User = require('./models/User')
const validators = require('./validators/auth')

module.exports = {
	Query: {
		hello: () => 'hi',
		users: (_, { limit }) => User.find().limit(limit)
	},
	Mutation: {
		createUser: async (_, { displayName, email, password }) => {
			validators.register.validate({
				email,
				password,
				displayName
			})
			const user = new User({ displayName })
			return await user.save()
		}
	}
}
