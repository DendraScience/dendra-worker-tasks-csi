/**
 * Send client specification to LDMP when connected.
 */

module.exports = {
  guard (m) {
    return !m.ldmpSpecifyError &&
      (m.ldmpConnectTs === m.versionTs) &&
      (m.ldmpSpecifyTs !== m.versionTs)
  },

  async execute (m, {logger}) {
    logger.info('LDMP client sending spec')

    await new Promise(resolve => setTimeout(resolve, 2000))

    return m.private.ldmpClient.specify(m.ldmpSpec)
  },

  assign (m, res, {logger}) {
    m.healthCheckTs = new Date()
    m.ldmpSpecifyTs = m.versionTs

    delete m.bookmarks

    logger.info('LDMP client sent spec', res)
  }
}
