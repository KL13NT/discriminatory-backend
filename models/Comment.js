const { model, Types } = require('mongoose')

const Comment = model('Comment', {
	author: { type: String, required: true, index: true },
	content: { type: String, required: true },
	created: { type: Date, required: true, default: Date.now },
	post: { type: String, required: true, index: true }
})

module.exports = Comment
