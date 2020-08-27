const { model, Schema } = require('mongoose')

const Comment = new Schema({
	author: { type: String, required: true },
	content: { type: String, required: true },
	created: { type: Date, required: true },
	post: { type: String, required: true }
})

Comment.index({ post: true })

module.exports = model('Comment', Comment)
