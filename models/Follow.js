const { model, Schema } = require('mongoose')

const Follow = new Schema({
	following: { type: String, required: true },
	created: { type: Date, required: true },
	author: { type: String, required: true }
})

Follow.index({ author: true })

module.exports = model('Follow', Follow)
