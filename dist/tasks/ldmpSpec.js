'use strict';

/**
 * Prepare LDMP client spec in the model if not defined, and after sources are ready.
 */

const moment = require('moment');

module.exports = {
  guard(m) {
    return !m.ldmpSpecError && m.sourcesTs === m.versionTs && m.ldmpSpecTs !== m.versionTs;
  },

  execute(m) {
    return Object.keys(m.sources).map(sourceKey => {
      const { spec_options: options, station, table } = m.sources[sourceKey];

      const spec = Object.assign({
        station,
        table
      }, options);

      if (!spec.start_option) {
        spec.start_option = 'at-oldest';

        if (m.state.bookmarks) {
          const bookmark = m.state.bookmarks.find(bm => bm.key === sourceKey);

          if (bookmark) {
            spec.time_stamp = moment(bookmark.value).utc().format('YYYY MM DD HH:mm:ss.SS');
            spec.start_option = 'at-time';
          }
        }
      }

      return spec;
    });
  },

  assign(m, res) {
    const log = m.$app.logger;

    log.info(`Agent [${m.key}]: LDMP client spec ready`);

    m.ldmpSpec = res;
    m.ldmpSpecTs = m.versionTs;
  }
};