/**
 * Check for missing data, force a disconnect if detected.
 */

module.exports = {
  guard (m) {
    return !m.healthCheckError && !m.healthCheckReady &&
      m.private.ldmpClient && m.private.ldmpClient.isConnected &&
      (m.ldmpSpecifyTs === m.versionTs)
  },

  execute (m, {logger}) {
    const now = new Date()
    const threshold = m.state.health_check_threshold

    logger.info('Health check started')

    if (threshold && m.healthCheckTs && ((now - m.healthCheckTs) > threshold * 1000)) {
      logger.error('Health check threshold exceeded')

      delete m.ldmpConnectTs
      delete m.ldmpSpecifyTs
    } else {
      logger.info('Health check passed')
    }

    return true
  }
}
