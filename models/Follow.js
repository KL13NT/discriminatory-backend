const { model } = require('mongoose')

const Follow = model('Follow', {
	following: { type: String, required: true },
	created: { type: Number, required: true },
	author: { type: String, required: true, index: true }
})

module.exports = Follow
