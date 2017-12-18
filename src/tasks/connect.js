export default {
  guard (m) {
    return !m.connectError &&
      m.private.client && !m.private.client.isConnected &&
      (m.specsStateAt === m.stateAt) &&
      (m.connectStateAt !== m.stateAt)
  },
  execute (m) {
    const log = m.$app.logger
    const client = m.private.client

    log.info(`Mach [${m.key}]: Connecting to ${client.options.host || 'localhost'}:${client.options.port}`)

    return client.connect().catch(err => {
      log.error(`Mach [${m.key}]: ${err.message}`)
      throw err
    })
  },
  assign (m) {
    const log = m.$app.logger

    log.info(`Mach [${m.key}]: Connected!`)

    m.connectStateAt = m.stateAt
  }
}
