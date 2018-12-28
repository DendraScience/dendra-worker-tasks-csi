'use strict';

/**
 * Check for missing data, force a disconnect if detected.
 */

module.exports = {
  guard(m) {
    return !m.healthCheckError && !m.healthCheckReady && m.private.ldmpClient && m.private.ldmpClient.isConnected && m.ldmpSpecifyTs === m.versionTs;
  },

  execute(m, { logger }) {
    const ts = new Date().getTime();
    const threshold = m.state.health_check_threshold;

    logger.info('Health check started');

    if (threshold && m.healthCheckTs && ts - m.healthCheckTs > threshold * 1000) {
      logger.error('Health check threshold exceeded');
      logger.info('LDMP client disconnecting');

      return m.private.ldmpClient.disconnect().catch(err => {
        logger.error('LDMP client disconnect error', err);
        throw err;
      });
    } else {
      logger.info('Health check passed');
    }

    return true;
  }
};