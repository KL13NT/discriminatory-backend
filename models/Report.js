const { model, Types } = require('mongoose')

const Report = model('Report', {
	author: { type: String, required: true, index: true },
	reason: { type: String, required: true },
	post: { type: Types.ObjectId, index: true }
})

module.exports = Report
