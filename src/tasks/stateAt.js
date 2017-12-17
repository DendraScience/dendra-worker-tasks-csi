export default {
  clear (m) {
    m.stateAt = m.state.created_at
  },
  guard (m) {
    return false
  },
  execute () {}
}
