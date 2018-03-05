'use strict';

/**
 * Connect to LDMP if not connected, and after NATS and the client spec are ready.
 */

module.exports = {
  guard(m) {
    return !m.ldmpConnectError && m.private.ldmpClient && !m.private.ldmpClient.isConnected && m.private.stan && m.stanConnected && m.ldmpSpecTs === m.versionTs && m.ldmpConnectTs !== m.versionTs;
  },

  execute(m) {
    const log = m.$app.logger;
    const client = m.private.ldmpClient;

    log.info(`Agent [${m.key}]: LDMP client connecting to ${client.options.host || 'localhost'}:${client.options.port}`);

    return client.connect().catch(err => {
      log.error(`Agent [${m.key}]: ${err.message}`);
      throw err;
    });
  },

  assign(m) {
    const log = m.$app.logger;

    log.info(`Agent [${m.key}]: LDMP client connected`);

    m.ldmpConnectTs = m.versionTs;
  }
};