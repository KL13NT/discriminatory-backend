const User = require('./models/User')
const admin = require('firebase-admin')
const validators = require('./validators/auth')
const { isAuthorized } = require('./utils')
const {
	AuthenticationError,
	ApolloError,
	ForbiddenError
} = require('apollo-server-express')

module.exports = {
	Mutation: {
		profile: async (
			_,
			data,
			{ token, access, decodedToken, authenticated }
		) => {
			if (!authenticated)
				throw AuthenticationError('You need to be registered to do this')

			if (
				!(await isAuthorized(data.id, admin.auth().getUser(decodedToken.uid)))
			)
				return new ForbiddenError(
					'You can not modify this resource. You may not have sufficient permissions or your email is not verified.'
				)

			await validators.profile.validateAsync(data)

			return await User.findOneAndUpdate(
				{ _id: data.id },
				{ ...data, _id: data.id },
				{
					upsert: true
				}
			)
		}
		// post: async(_, post, ctx){

		// }
	},
	Query: {
		profile: async (_, { id: _id }) => {
			console.log('QUERY PROFILE', _id)
			const user = await admin.auth().getUser(_id)
			if (!user) throw Error('A user with this id was not found')

			return await User.findOne({ _id })
		}
	}
}
