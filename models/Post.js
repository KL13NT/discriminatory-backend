const { model } = require('mongoose')

const Post = model('Post', {
	content: { type: String, required: true },
	location: { type: String, required: true },
	created: { type: Date, required: true },
	author: { type: String, required: true, index: true },
	pinned: { type: Boolean, required: false, default: false }
})

module.exports = Post
