import * as admin from 'firebase-admin'
import validators from '../validators/auth'

const SERVICE_ACC = require('../discriminatory-17437-firebase-adminsdk-1z1nh-15c9bae0f2.json')
const headers = { 'Content-Type': 'application/json' }

admin.initializeApp({
	credential: credential.cert(SERVICE_ACC),
	databaseURL: 'https://discriminatory-17437.firebaseio.com'
})

const register = async request => {
	try {
		const result = validators.register.validate(request.body, {
			abortEarly: false
		})

		if (result.errors.length > 0)
			return new Response({ errors: result.errors }, { status: 400 })
		else {
			const userRecord = await admin.auth().createUser({
				email: result.value.email,
				password: result.value.password,
				displayName: result.value.name
			})

			return new Response({}, { status: 201 })
		}
	} catch (err) {
		return new Response(err)
	}
}

// const login = request => {
// 	try {
// 		return new Response(template(), { headers })
// 	} catch (err) {
// 		return new Response(err)
// 	}
// }

const authHandler = async request => {
	if (request.url.endsWith('/register')) return register(request)
	//else if(request.url.endsWith('/login')) return login(request)
	else return new Response({}, { status: 404 })
}

module.exports = authHandler
