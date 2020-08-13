const { model, Types } = require('mongoose')

const Post = model('Post', {
	content: { type: String, required: true },
	location: { type: String, required: true },
	created: { type: Date, required: true, default: Date.now },
	author: { type: String, required: true, index: true }
})

module.exports = Post
