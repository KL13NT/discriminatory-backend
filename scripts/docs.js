const fs = require('fs')
const path = require('path')
const child = require('child_process')
const { promisify } = require('util')

const readFile = promisify(fs.readFile)
const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)
const rmdir = promisify(fs.rmdir)
const exec = promisify(child.exec)

const home = process.cwd()
const outputDir = path.resolve(home, './docs/temp')
const outputFile = path.resolve(outputDir, 'types.graphql')
const files = ['./types.graphql', './queries.graphql']

async function save(types) {
	try {
		await writeFile(outputFile, types, { flag: 'w' })
		await exec(`yarn graphdoc -s ${outputFile} -o ${home}/docs/schema --force`)

		rmdir(outputDir, { recursive: true })
	} catch (error) {
		process.exit(1)
	}
}

async function generateDocs() {
	const types = await files.reduce(async (output, curr) => {
		const data = await readFile(path.resolve(home, curr), 'utf-8')

		return `${await output}\n${data}`.trim()
	}, await Promise.resolve(''))

	mkdir(outputDir)
		.then(() => {
			save(types)
		})
		.catch(err => {
			if (err.code === 'EEXIST') save(types)
			else process.exit(2)
		})
}

generateDocs()
