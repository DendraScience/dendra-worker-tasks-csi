/**
 * Connect to LDMP if not connected, and after NATS and the client spec are ready.
 */

module.exports = {
  guard(m) {
    return (
      !m.ldmpConnectError &&
      m.private.ldmpClient &&
      !m.private.ldmpClient.isConnected &&
      m.private.stan &&
      m.stanConnected &&
      m.ldmpSpecTs === m.versionTs &&
      m.ldmpConnectTs !== m.versionTs
    )
  },

  async execute(m, { logger }) {
    const client = m.private.ldmpClient

    logger.info('LDMP client connecting', {
      host: client.options.host || 'localhost',
      port: client.options.port
    })

    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      return await client.connect()
    } catch (err) {
      logger.error('LDMP client connect error', err)
      throw err
    }
  },

  assign(m, res, { logger }) {
    res.on('error', err => {
      logger.error('LDMP client socket error', err)
    })

    m.ldmpConnectTs = m.versionTs
  }
}
