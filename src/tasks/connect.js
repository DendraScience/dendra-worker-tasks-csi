export default {
  guard (m) {
    return !m.connectError &&
      m.private.client && !m.private.client.isConnected &&
      (m.specsStateAt === m.state.created_at) &&
      (m.connectStateAt !== m.state.created_at)
  },
  execute (m) {
    return Promise.race([
      m.private.client.connect(),
      // NOTE: Hardcoded 20 second timeout
      new Promise((resolve, reject) => setTimeout(reject, 20000, new Error('Connect timeout')))
    ]).catch(err => {
      if (m.private.client.socket) m.private.client.socket.destroy()
      throw err
    })
  },
  assign (m) {
    m.connectStateAt = m.state.created_at
  }
}
