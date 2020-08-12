const { model, ObjectId } = require('mongoose')

module.exports = model('User', {
	// posts: [String],
	displayName: { type: String, required: true },
	email: { type: String, required: true },
	location: { type: String, required: true },
	dateofbirth: { type: Date, required: true },
	tagline: { type: String, required: false },
	_id: { type: String, required: true }
})
