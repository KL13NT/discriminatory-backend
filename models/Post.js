const { model, Types } = require('mongoose')

const Post = model('Post', {
	content: { type: String, required: true },
	location: { type: String, required: true },
	created: { type: Number, required: true },
	author: { type: Types.ObjectId, required: true, index: true }
})

module.exports = Post
