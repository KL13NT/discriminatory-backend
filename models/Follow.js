const { model, Types } = require('mongoose')

const Follow = model('Follow', {
	following: { type: String, required: true },
	created: { type: Number, required: true },
	author: { type: Types.ObjectId, required: true, index: true }
})

module.exports = Follow
