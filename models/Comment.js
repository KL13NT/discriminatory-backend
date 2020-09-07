const { model, Schema, Types } = require('mongoose')

const Comment = new Schema({
	author: { type: String, required: true },
	content: { type: String, required: true },
	created: { type: Date, required: true },
	post: { type: Types.ObjectId, required: true }
})

Comment.index({ post: true })

module.exports = model('Comment', Comment)
