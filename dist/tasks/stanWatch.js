"use strict";

/**
 * Trigger NATS (and LDMP) reconnect if we're supposed to be connected and we're not.
 */

module.exports = {
  guard(m) {
    return !m.stanWatchReady && m.private.stan && !m.stanConnected;
  },

  execute(m) {
    return true;
  },

  assign(m) {
    const log = m.$app.logger;

    log.error(`Agent [${m.key}]: NATS Streaming reset`);

    delete m.private.stan;
    delete m.stanConnected;
    delete m.ldmpConnectTs;
    delete m.ldmpSpecifyTs;
  }
};