const { model, ObjectId } = require('mongoose')

module.exports = model('User', {
	// posts: [String],
	displayName: String,
	email: String,
	ID: ObjectId
})
