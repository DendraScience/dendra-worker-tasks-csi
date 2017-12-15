export default {
  guard (m) {
    return !m.disconnectError &&
      m.client && m.client.isConnected &&
      (m.connectStateAt !== m.state.updated_at)
  },
  execute (m) {
    return m.client.disconnect().then(() => true)
  }
}
