'use strict';

/**
 * Persist model bookmarks to a separate state doc.
 */

module.exports = {
  guard(m) {
    return !m.saveBookmarksError && !m.saveBookmarksReady && m.private.ldmpClient && m.private.ldmpClient.isConnected && m.ldmpSpecifyTs === m.versionTs && m.bookmarks;
  },

  async execute(m, { logger }) {
    const docId = `${m.key}-bookmarks`;
    let doc;

    logger.info(`Saving bookmarks to '${docId}'`);

    try {
      const bookmarks = [];
      const docService = m.$app.service('/state/docs');

      try {
        const d = await docService.get(docId);
        if (d.bookmarks) bookmarks.push(...d.bookmarks);
      } catch (err) {
        if (err.code !== 404) throw err;

        logger.info(`No state doc found for '${docId}'`);
      }

      // Update bookmark values or add new bookmarks
      Object.keys(m.bookmarks).forEach(key => {
        const bookmark = bookmarks.find(bm => bm.key === key);
        const value = m.bookmarks[key];

        if (bookmark) {
          bookmark.value = Math.max(bookmark.value, value);
        } else {
          bookmarks.push({
            key,
            value
          });
        }
      });

      logger.info(`Updating state doc '${docId}'`);

      try {
        doc = await docService.update(docId, {
          _id: docId,
          bookmarks
        });
      } catch (err) {
        if (err.code !== 404) throw err;

        logger.info(`No state doc found for '${docId}'`);
      }

      if (!doc) {
        logger.info(`Creating state doc '${docId}'`);

        doc = await docService.create({
          _id: docId,
          bookmarks
        });
      }
    } catch (err) {
      logger.error('Save bookmarks error', err);
      throw err;
    }

    return doc;
  },

  assign(m, res, { logger }) {
    logger.info(`Saved (${res.bookmarks.length}) bookmark(s)`);
  }
};