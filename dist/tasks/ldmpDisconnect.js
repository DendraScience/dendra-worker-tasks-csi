"use strict";

/**
 * Disconnect from LDMP if connected and new state is detected.
 */

module.exports = {
  guard(m) {
    return !m.ldmpDisconnectError && m.private.ldmpClient && m.private.ldmpClient.isConnected && m.ldmpConnectTs !== m.versionTs;
  },

  execute(m) {
    const log = m.$app.logger;

    log.info(`Agent [${m.key}]: LDMP client disconnecting`);

    return m.private.ldmpClient.disconnect().catch(err => {
      log.error(`Agent [${m.key}]: ${err.message}`);
      throw err;
    });
  }
};