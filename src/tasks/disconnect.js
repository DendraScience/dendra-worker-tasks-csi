export default {
  guard (m) {
    return !m.disconnectError &&
      m.private.client && m.private.client.isConnected &&
      (m.connectStateAt !== m.state.created_at)
  },
  execute (m) {
    return m.private.client.disconnect().then(() => true)
  }
}
