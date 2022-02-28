"use strict";

/**
 * Prepare LDMP client spec in the model if not defined, and after sources are ready.
 */
const moment = require('moment');

const AT_TIME_FORMAT = 'YYYY MM DD HH:mm:ss.SS';
module.exports = {
  guard(m) {
    return !m.ldmpSpecError && m.sourcesTs === m.versionTs && m.ldmpSpecTs !== m.versionTs;
  },

  async execute(m, {
    logger
  }) {
    const docId = `${m.key}-bookmarks`;
    let doc;

    try {
      doc = await m.$app.service('/state/docs').get(docId);
    } catch (err) {
      if (err.code === 404) {
        logger.info(`No state doc found for '${docId}'`);
      } else {
        logger.error('Get bookmarks error', err);
      }
    }

    const now = moment().utc();
    return m.sourceKeys.map(sourceKey => {
      const {
        backfill,
        spec_options: options,
        station,
        table
      } = m.sources[sourceKey];
      const spec = Object.assign({
        station,
        table
      }, options);
      /*
        Determine start_option if missing: use bookmark, backfill option, then oldest.
       */

      if (!spec.start_option && doc && doc.bookmarks) {
        const bookmark = doc.bookmarks.find(bm => bm.key === sourceKey);

        if (bookmark) {
          spec.start_option = 'at-time';
          spec.time_stamp = moment(bookmark.value).utc().format(AT_TIME_FORMAT);
        }
      }

      if (!spec.start_option && typeof backfill === 'object') {
        spec.start_option = 'at-time';
        spec.time_stamp = now.clone().subtract(backfill).format(AT_TIME_FORMAT);
      }

      if (!spec.start_option) {
        spec.start_option = 'at-oldest';
      }

      return spec;
    });
  },

  assign(m, res, {
    logger
  }) {
    m.ldmpSpec = res;
    m.ldmpSpecTs = m.versionTs;
    logger.info('LDMP client spec ready', res);
  }

};