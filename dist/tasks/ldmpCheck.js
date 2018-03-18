'use strict';

/**
 * Trigger LDMP reconnect if we're supposed to be connected and we're not.
 */

module.exports = {
  guard(m) {
    return !m.ldmpCheckError && !m.ldmpCheckReady && m.private.ldmpClient && !m.private.ldmpClient.isConnected && m.ldmpConnectTs === m.versionTs;
  },

  execute(m) {
    return true;
  },

  assign(m, res, { logger }) {
    delete m.ldmpConnectTs;
    delete m.ldmpSpecifyTs;

    logger.error('LDMP connection reset');
  }
};