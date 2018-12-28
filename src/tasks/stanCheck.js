/**
 * Trigger NATS (and LDMP) reconnect if we're supposed to be connected and we're not.
 */

module.exports = {
  guard (m) {
    return !m.stanCheckError && !m.stanCheckReady &&
      m.private.stan && !m.stanConnected
  },

  execute (m, { logger }) {
    if (m.private.ldmpClient && m.private.ldmpClient.isConnected) {
      logger.info('LDMP client disconnecting')

      return m.private.ldmpClient.disconnect().catch(err => {
        logger.error('LDMP client disconnect error', err)
        // Intentionally eat the error
      })
    }

    return true
  },

  assign (m, res, { logger }) {
    m.private.stan.removeAllListeners()

    delete m.private.stan
    delete m.stanConnected
    delete m.stanTs

    logger.error('NATS Streaming reset')
  }
}
