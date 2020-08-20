module.exports = {
	POST_CONTENT_MIN: 1,
	POST_CONTENT_MAX: 160,

	PROFILE_LOCATION_MIN: 10,
	PROFILE_LOCATION_MAX: 40,

	LOCATION_MAX: 120,
	LOCATION_MIN: 5,

	ID_MAX: 160,
	ID_MIN: 20,

	TAGLINE_MAX: 160,
	TAGLINE_MIN: 0,

	DISPLAYNAME_MAX: 60,
	DISPLAYNAME_MIN: 2,

	RATE_LIMIT_DUPLICATE: 3600000, // 1 hour
	RATE_LIMIT_GENERAL: 60 * 1000, // 1 minute
	RATE_LIMIT_BASE: 200, // 1 second

	FEED_LIMIT_MAX: 20, // query `limit`
	FEED_LIMIT_QUERY_PERIOD: 60 * 1000, // time required for cache re-validations
	FEED_COMMENTS_PER_POST: 10,

	MEMBER_FOLLOW_LIMIT: 100,
	AVATAR_UPDATE_PERIOD: 24 * 60 * 60 * 1000 // change every 24 hours
}
