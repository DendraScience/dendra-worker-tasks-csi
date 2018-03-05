'use strict';

module.exports = {
  ldmpClient: require('./tasks/ldmpClient'),
  ldmpConnect: require('./tasks/ldmpConnect'),
  ldmpDisconnect: require('./tasks/ldmpDisconnect'),
  ldmpSpec: require('./tasks/ldmpSpec'),
  ldmpSpecify: require('./tasks/ldmpSpecify'),
  ldmpWatch: require('./tasks/ldmpWatch'),
  recordMissing: require('./tasks/recordMissing'),
  sources: require('./tasks/sources'),
  stan: require('./tasks/stan'),
  stanWatch: require('./tasks/stanWatch'),
  stateBookmarks: require('./tasks/stateBookmarks'),
  versionTs: require('./tasks/versionTs')
};