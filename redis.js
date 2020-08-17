const { promisify } = require('util')
const redis = require('redis')

const client = redis.createClient()

client.on('error', error => {
	// eslint-disable-next-line no-console
	console.error(error)
})

const get = promisify(client.get).bind(client)
const set = promisify(client.set).bind(client)

module.exports = {
	get,
	set,
	client
}
