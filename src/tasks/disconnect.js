export default {
  guard (m) {
    return !m.disconnectError &&
      m.private.client && m.private.client.isConnected &&
      (m.connectStateAt !== m.stateAt)
  },
  execute (m) {
    const log = m.$app.logger
    const client = m.private.client

    log.info(`Mach [${m.key}]: Disconnecting`)

    return client.disconnect().catch(err => {
      log.error(`Mach [${m.key}]: ${err.message}`)
      throw err
    })
  }
}
