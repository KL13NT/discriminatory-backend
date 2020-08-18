const { model, Types } = require('mongoose')

const User = model('User', {
	displayName: { type: String, required: true },
	email: { type: String, required: true },
	location: { type: String, required: true },
	dateofbirth: { type: Date, required: true },
	tagline: { type: String, required: false },
	pinned: { type: String, required: false },
	_id: { type: Types.ObjectId, required: true }
})

module.exports = User
