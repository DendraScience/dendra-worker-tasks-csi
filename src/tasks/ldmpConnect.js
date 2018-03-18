/**
 * Connect to LDMP if not connected, and after NATS and the client spec are ready.
 */

module.exports = {
  guard (m) {
    return !m.ldmpConnectError &&
      m.private.ldmpClient && !m.private.ldmpClient.isConnected &&
      m.private.stan && m.stanConnected &&
      (m.ldmpSpecTs === m.versionTs) &&
      (m.ldmpConnectTs !== m.versionTs)
  },

  execute (m, {logger}) {
    const client = m.private.ldmpClient

    logger.info('LDMP client connecting', {
      host: client.options.host || 'localhost',
      port: client.options.port
    })

    return client.connect().catch(err => {
      logger.error('LDMP client connect error', err)
      throw err
    })
  },

  assign (m, res, {logger}) {
    m.ldmpConnectTs = m.versionTs

    logger.info('LDMP client connected')
  }
}
