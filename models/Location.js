const { model, Schema } = require('mongoose')

const Location = new Schema({
	location: {
		type: String,
		required: true
	},
	reputation: { type: Number, required: true }
})

Location.index({ location: 'text', reputation: 1 })

module.exports = model('Location', Location)
