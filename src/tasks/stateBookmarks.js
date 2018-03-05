/**
 * Update state.bookmarks with a snapshot of current bookmarks.
 */

module.exports = {
  guard (m) {
    return !m.stateBookmarksReady &&
      m.bookmarks
  },

  execute () { return true },

  assign (m) {
    m.state.bookmarks = Object.keys(m.bookmarks).map(key => {
      return {
        key,
        value: m.bookmarks[key]
      }
    })
  }
}
