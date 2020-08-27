const { model, Types, Schema } = require('mongoose')

const Post = new Schema({
	content: { type: String, required: true },
	location: { type: Types.ObjectId, required: true },
	created: { type: Date, required: true },
	author: { type: String, required: true },
	pinned: { type: Boolean, required: false, default: false }
})

Post.index({ author: 'text', location: true })

module.exports = model('Post', Post)
