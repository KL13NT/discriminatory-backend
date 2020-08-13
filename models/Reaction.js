const { model, Types } = require('mongoose')

const Reaction = model('Reaction', {
	author: { type: String, required: true },
	reaction: { type: String, required: true },
	created: { type: Date, required: true, default: Date.now },
	post: { type: Types.ObjectId, index: true }
})

module.exports = Reaction
