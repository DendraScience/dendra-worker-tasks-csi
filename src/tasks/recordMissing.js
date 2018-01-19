export default {
  guard (m) {
    return !m.recordMissingReady &&
      m.private.client && m.private.client.isConnected &&
      (m.specifyStateAt === m.stateAt)
  },
  execute (m) {
    const now = new Date()

    return Object.keys(m.sources).filter(sourceKey => {
      const source = m.sources[sourceKey]
      const threshold = source.record_missing_threshold

      return threshold &&
        source.recordAckAt &&
        (now - source.recordAckAt) > threshold * 1000
    })
  },
  assign (m, res) {
    const log = m.$app.logger

    if (res.length > 0) {
      log.error(`Mach [${m.key}]: Record missing for: ${res.join(', ')}`)

      delete m.connectStateAt
      delete m.specifyStateAt
    } else {
      log.info(`Mach [${m.key}]: No records missing`)
    }
  }
}
