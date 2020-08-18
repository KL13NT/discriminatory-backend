const { model, Types } = require('mongoose')

const Reaction = model('Reaction', {
	author: { type: String, required: true },
	reaction: { type: String, required: true },
	created: { type: Date, required: true },
	post: { type: Types.ObjectId, required: true, index: true }
})

module.exports = Reaction
