const { model } = require('mongoose')

const Report = model('Report', {
	author: { type: String, required: true, index: true },
	reason: { type: String, required: true },
	post: { type: String, required: true, index: true }
})

module.exports = Report
