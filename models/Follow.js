const { model, Schema } = require('mongoose')

const Follow = new Schema({
	author: { type: String, required: true },
	following: { type: String, required: true },
	created: { type: Date, required: true }
})

Follow.index({ author: true })

module.exports = model('Follow', Follow)
