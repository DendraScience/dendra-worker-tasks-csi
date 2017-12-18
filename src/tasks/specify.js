export default {
  guard (m) {
    return !m.specifyError &&
      m.private.client && m.private.client.isConnected &&
      (m.connectStateAt === m.stateAt) &&
      (m.specifyStateAt !== m.stateAt)
  },
  execute (m) {
    const log = m.$app.logger

    log.info(`Mach [${m.key}]: Sending specs`)

    return m.private.client.specify(m.specs)
  },
  assign (m, res) {
    const log = m.$app.logger

    log.info(`Mach [${m.key}]: Sent: ${res}`)

    m.specifyStateAt = m.stateAt
  }
}
