/**
 * Check for unsent records after an ack, force a disconnect if found.
 */

module.exports = {
  guard (m) {
    return !m.recordMissingReady &&
      m.private.ldmpClient && m.private.ldmpClient.isConnected &&
      (m.ldmpSpecifyTs === m.versionTs)
  },

  execute (m) {
    const now = new Date()

    return Object.keys(m.sources).filter(sourceKey => {
      const source = m.sources[sourceKey]
      const threshold = source.record_missing_threshold

      return threshold &&
        source.ackTs &&
        (now - source.ackTs) > threshold * 1000
    })
  },

  assign (m, res) {
    const log = m.$app.logger

    if (res.length > 0) {
      log.error(`Agent [${m.key}]: Record missing for: ${res.join(', ')}`)

      delete m.ldmpConnectTs
      delete m.ldmpSpecifyTs
    } else {
      log.info(`Agent [${m.key}]: No records missing`)
    }
  }
}
