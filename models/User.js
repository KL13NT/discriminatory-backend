const { model } = require('mongoose')

const User = model('User', {
	displayName: { type: String, required: true },
	email: { type: String, required: true },
	location: { type: String, required: true },
	tagline: { type: String, required: false },
	pinned: { type: String, required: false },
	_id: { type: String, required: true }
})

module.exports = User
