const User = require('../models/User')
const validators = require('../validators/auth')
const admin = require('firebase-admin')

const config = {
	databaseURL: 'https://discriminatory-17437.firebaseio.com',
	credential: admin.credential.cert(require('../admin.firebase.json'))
}

admin.initializeApp(config)

module.exports = {
	Mutation: {
		register: async (
			_,
			{ displayName, email, dateofbirth, location, tagline, uid }
		) => {
			await validators.register.validateAsync({
				displayName,
				email,
				dateofbirth,
				location,
				tagline,
				uid
			})

			const { emailVerified } = await admin.auth().getUser(uid)

			if (!emailVerified) throw Error('User email is not verified')

			const user = new User({
				displayName,
				email,
				dateofbirth,
				location,
				tagline,
				_id: uid
			})
			return await user.save()
		}
	}
}
