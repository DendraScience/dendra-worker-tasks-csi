export default {
  guard (m) {
    return !m.specifyError &&
      m.private.client && m.private.client.isConnected &&
      (m.connectStateAt === m.state.created_at) &&
      (m.specifyStateAt !== m.state.created_at)
  },
  execute (m) {
    return m.private.client.specify(m.specs)
  },
  assign (m) {
    m.specifyStateAt = m.state.created_at
  }
}
