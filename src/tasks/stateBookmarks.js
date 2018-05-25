/**
 * Update state.bookmarks with a snapshot of current bookmarks.
 */

module.exports = {
  guard (m) {
    return !m.stateBookmarksError && !m.stateBookmarksReady &&
      m.private.ldmpClient && m.private.ldmpClient.isConnected &&
      (m.ldmpSpecifyTs === m.versionTs) &&
      m.bookmarks
  },

  execute () { return true },

  assign (m, res, {logger}) {
    if (!m.state.bookmarks) m.state.bookmarks = []

    Object.keys(m.bookmarks).map(key => {
      const bookmark = m.state.bookmarks.find(bm => bm.key === key)
      const value = m.bookmarks[key]

      if (bookmark) {
        bookmark.value = Math.max(bookmark.value, value)
      } else {
        m.state.bookmarks.push({
          key,
          value
        })
      }
    })

    logger.info('Bookmarks assigned')
  }
}
