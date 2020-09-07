const { model, Schema, Types } = require('mongoose')

const Report = new Schema({
	author: { type: String, required: true },
	reason: { type: String, required: true },
	post: { type: Types.ObjectId, required: true }
})

Report.index({ author: true, post: true })

module.exports = model('Report', Report)
