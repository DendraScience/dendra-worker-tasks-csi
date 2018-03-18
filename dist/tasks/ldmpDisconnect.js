'use strict';

/**
 * Disconnect from LDMP if connected and new state is detected.
 */

module.exports = {
  guard(m) {
    return !m.ldmpDisconnectError && !m.ldmpDisconnectReady && m.private.ldmpClient && m.private.ldmpClient.isConnected && m.ldmpConnectTs !== m.versionTs;
  },

  execute(m, { logger }) {
    logger.info('LDMP client disconnecting');

    return m.private.ldmpClient.disconnect().catch(err => {
      logger.info('LDMP client disconnect error', err);
      throw err;
    });
  }
};