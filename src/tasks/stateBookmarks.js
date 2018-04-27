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

  execute (m) {
    return Object.keys(m.bookmarks).map(key => {
      return {
        key,
        value: m.bookmarks[key]
      }
    })
  },

  assign (m, res, {logger}) {
    m.state.bookmarks = res

    logger.info('Bookmarks assigned')
  }
}
