const { model } = require('mongoose')

const Comment = model('Comment', {
	author: { type: String, required: true, index: true },
	content: { type: String, required: true },
	created: { type: Date, required: true },
	post: { type: String, required: true, index: true }
})

module.exports = Comment
