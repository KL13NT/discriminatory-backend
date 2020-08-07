const Joi = require('@hapi/joi')

const register = Joi.object({
	name: Joi.string()
		.pattern(/^[a-zA-Z ]+$/)
		.min(4)
		.max(36)
		.required(),

	password: Joi.string()
		.pattern(
			/(?=(.*[0-9]))(?=.*[\!@#$%^&*()\\[\]{}\-_+=~`|:;"'<>,.\/?])(?=.*[a-z])(?=(.*[A-Z]))(?=(.*))/
		)
		.min(8)
		.max(30),

	email: Joi.string().email()
})
	.with('name', 'email')
	.with('email', 'password')
	.with('name', 'password')

const login = Joi.object({
	password: Joi.string()
		.pattern(
			/(?=(.*[0-9]))(?=.*[\!@#$%^&*()\\[\]{}\-_+=~`|:;"'<>,.\/?])(?=.*[a-z])(?=(.*[A-Z]))(?=(.*))/
		)
		.min(8)
		.max(30),

	email: Joi.string().email()
})
	.with('name', 'email')
	.with('email', 'password')
	.with('name', 'password')

module.exports = { register, login }
