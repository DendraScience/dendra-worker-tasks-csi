'use strict';

/**
 * Send client specification to LDMP when connected.
 */

module.exports = {
  guard(m) {
    return !m.ldmpSpecifyError && m.ldmpConnectTs === m.versionTs && m.ldmpSpecifyTs !== m.versionTs;
  },

  execute(m, { logger }) {
    logger.info('LDMP client sending spec');

    return m.private.ldmpClient.specify(m.ldmpSpec);
  },

  assign(m, res, { logger }) {
    m.healthCheckTs = new Date();
    m.ldmpSpecifyTs = m.versionTs;

    logger.info('LDMP client sent spec', res);
  }
};