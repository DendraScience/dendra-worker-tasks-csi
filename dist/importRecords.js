'use strict';

module.exports = {
  healthCheck: require('./tasks/healthCheck'),
  ldmpCheck: require('./tasks/ldmpCheck'),
  ldmpClient: require('./tasks/ldmpClient'),
  ldmpConnect: require('./tasks/ldmpConnect'),
  ldmpDisconnect: require('./tasks/ldmpDisconnect'),
  ldmpSpec: require('./tasks/ldmpSpec'),
  ldmpSpecify: require('./tasks/ldmpSpecify'),
  saveBookmarks: require('./tasks/saveBookmarks'),
  sources: require('./tasks/sources'),
  stan: require('./tasks/stan'),
  stanCheck: require('./tasks/stanCheck'),
  versionTs: require('./tasks/versionTs')
};