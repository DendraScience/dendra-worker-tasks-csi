"use strict";

/**
 * Send client specification to LDMP when connected.
 */

module.exports = {
  guard(m) {
    return !m.ldmpSpecifyError && m.ldmpConnectTs === m.versionTs && m.ldmpSpecifyTs !== m.versionTs;
  },

  execute(m) {
    const log = m.$app.logger;

    log.info(`Agent [${m.key}]: LDMP client sending spec`);

    return m.private.ldmpClient.specify(m.ldmpSpec);
  },

  assign(m, res) {
    const log = m.$app.logger;

    log.info(`Agent [${m.key}]: LDMP client sent spec: ${res}`);

    m.ldmpSpecifyTs = m.versionTs;
  }
};