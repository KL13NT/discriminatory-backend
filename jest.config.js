module.exports = {
	clearMocks: true,
	coverageDirectory: './docs/coverage',
	testEnvironment: 'node',
	moduleNameMapper: {
		'\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|embed)$':
			'<rootDir>/src/__mocks__/fileMock.js',
		'\\.(css|less|sass)$': '<rootDir>/node_modules/identity-obj-proxy'
	},
	coverageReporters: ['json-summary', 'html', 'text', 'lcov'],
	testMatch: ['./__tests__/**/*.test.js']
}
