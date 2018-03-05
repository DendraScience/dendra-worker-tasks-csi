/**
 * Create a NATS client if not defined and connected. Add event listeners to manage state.
 */

const STAN = require('node-nats-streaming')

module.exports = {
  guard (m) {
    return !m.stanError &&
      !m.private.stan && !m.stanConnected
  },

  execute (m) {
    const cfg = m.$app.get('clients').stan
    const stan = STAN.connect(cfg.cluster, cfg.client, cfg.opts || {})

    return new Promise((resolve, reject) => {
      stan.once('connect', () => {
        stan.removeAllListeners()
        resolve(stan)
      })
      stan.once('error', err => {
        stan.removeAllListeners()
        reject(err)
      })
    })
  },

  assign (m, res) {
    const log = m.$app.logger

    log.info(`Agent [${m.key}]: NATS Streaming connected`)

    m.private.stan = res
    m.private.stan.on('close', () => {
      log.info(`Agent [${m.key}]: NATS Streaming closed`)

      m.stanConnected = false
    })

    m.stanConnected = true
  }
}
