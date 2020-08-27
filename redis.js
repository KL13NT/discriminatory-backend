const { promisify } = require('util')
const redis = require('redis')

const client = redis.createClient()

client.on('error', error => {
	// eslint-disable-next-line no-console
	console.error(error)
	process.exit(1)
})

const get = promisify(client.get).bind(client)
const set = promisify(client.set).bind(client)
const expire = promisify(client.expire).bind(client)
const incr = promisify(client.incr).bind(client)

module.exports = {
	get,
	set,
	expire,
	incr,
	client
}
