const { RateLimitError } = require('../errors')

const limitLimit = limit => validationContext => {
	const { definitions } = validationContext.getDocument()
	let found = null

	definitions.forEach(def => {
		if (def.operation !== 'query') return

		const selections = def.selectionSet.selections.filter(
			selection => selection.arguments
		)

		const limitSelection = selections.find(selection =>
			selection.arguments.find(arg => arg.name.value === 'limit')
		)

		if (!limitSelection) return

		found = limitSelection.arguments.find(
			arg =>
				arg.name.value === 'limit' &&
				(arg.value.value > limit || arg.value.value < 1)
		)
	})

	if (found) {
		validationContext.reportError(
			new RateLimitError(`[RATE_LIMIT] Cannot query more than ${limit}`)
		)
	}

	return validationContext
}

module.exports = limitLimit
