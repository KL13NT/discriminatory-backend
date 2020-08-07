const HOST = 'discriminatorynetwork.workers.dev'
const PATHS = {
	auth: new RegExp(`^${HOST}\\/auth$`)
}
const auth = require('./routes/auth')
const HANDLERS = {
	auth
}

addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
	const path = Object.keys(PATHS).find(path => request.url.match(PATHS[path]))

	if (!path) return new Response({}, { status: 404 })

	return HANDLERS[path]()
}
