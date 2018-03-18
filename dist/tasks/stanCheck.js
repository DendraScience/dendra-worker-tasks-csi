'use strict';

/**
 * Trigger NATS (and LDMP) reconnect if we're supposed to be connected and we're not.
 */

module.exports = {
  guard(m) {
    return !m.stanCheckError && !m.stanCheckReady && m.private.stan && !m.stanConnected;
  },

  execute(m) {
    return true;
  },

  assign(m, res, { logger }) {
    m.private.stan.removeAllListeners();

    delete m.private.stan;
    delete m.stanConnected;
    delete m.ldmpConnectTs;
    delete m.ldmpSpecifyTs;

    logger.error('NATS Streaming reset');
  }
};