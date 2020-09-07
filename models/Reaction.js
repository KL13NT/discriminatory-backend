const { model, Types, Schema } = require('mongoose')

const Reaction = new Schema({
	author: { type: String, required: true },
	reaction: { type: String, required: true },
	created: { type: Date, required: true },
	post: { type: Types.ObjectId, required: true }
})

Reaction.index({ post: true })

module.exports = model('Reaction', Reaction)
