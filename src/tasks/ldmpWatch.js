/**
 * Trigger LDMP reconnect if we're supposed to be connected and we're not.
 */

module.exports = {
  guard (m) {
    return !m.ldmpWatchReady &&
      m.private.ldmpClient && !m.private.ldmpClient.isConnected &&
      (m.ldmpConnectTs === m.versionTs)
  },

  execute (m) { return true },

  assign (m) {
    const log = m.$app.logger

    log.error(`Agent [${m.key}]: LDMP connection reset`)

    delete m.ldmpConnectTs
    delete m.ldmpSpecifyTs
  }
}
