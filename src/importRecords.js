module.exports = {
  healthCheck: require('./tasks/healthCheck'),
  ldmpCheck: require('./tasks/ldmpCheck'),
  ldmpClient: require('./tasks/ldmpClient'),
  ldmpConnect: require('./tasks/ldmpConnect'),
  ldmpDisconnect: require('./tasks/ldmpDisconnect'),
  ldmpSpec: require('./tasks/ldmpSpec'),
  ldmpSpecify: require('./tasks/ldmpSpecify'),
  sources: require('./tasks/sources'),
  stan: require('./tasks/stan'),
  stanCheck: require('./tasks/stanCheck'),
  stateBookmarks: require('./tasks/stateBookmarks'),
  versionTs: require('./tasks/versionTs')
}
