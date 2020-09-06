/* eslint-disable */
const autocannon = require('autocannon')
const { exec } = require('child_process')

const cannon = autocannon(
	{
		url: 'http://localhost:3000/graphql',
		connections: 100,
		pipelining: 1,
		amount: 1000,
		method: 'POST',
		body: JSON.stringify({
			query:
				'query ($before: ID) {\n  explore(before: $before) {\n    content\n    created\n    location {\n      location\n      reputation\n      __typename\n    }\n    _id\n    author {\n      displayName\n      avatar\n      verified\n      _id\n      __typename\n    }\n    comments {\n      _id\n      content\n      author {\n        displayName\n        avatar\n        verified\n        _id\n        __typename\n      }\n      __typename\n    }\n    reactions {\n      upvotes\n      downvotes\n      reaction\n      __typename\n    }\n    __typename\n  }\n}\n',
			variables: { before: null }
		}),
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 6.3; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0',
			Accept: '*/*',
			'Accept-Language': 'en-GB,ar-EG;q=0.5',
			'content-type': 'application/json',
			authorization: 'Bearer 0000',
			Pragma: 'no-cache',
			'Cache-Control': 'no-cache'
		}
	},
	console.log
)

cannon.on('reqError', console.log)
