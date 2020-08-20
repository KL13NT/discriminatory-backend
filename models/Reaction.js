const { model } = require('mongoose')

const Reaction = model('Reaction', {
	author: { type: String, required: true },
	reaction: { type: String, required: true },
	created: { type: Date, required: true },
	post: { type: String, required: true, index: true }
})

module.exports = Reaction
