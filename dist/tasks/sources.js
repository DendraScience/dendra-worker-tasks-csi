"use strict";

/**
 * Prepare model sources if not defined, or when new state is detected.
 */

module.exports = {
  guard(m) {
    return !m.sourcesError && m.state.sources && m.state.sources.length > 0 && m.sourcesTs !== m.versionTs;
  },

  execute(m) {
    return m.state.sources.reduce((sources, src) => {
      if (src.pub_to_subject && src.station && src.table) {
        const sourceKey = `${src.station}$$${src.table}`;
        sources[sourceKey] = Object.assign({}, m.state.defaults, src);
      }

      return sources;
    }, {});
  },

  assign(m, res) {
    const log = m.$app.logger;

    log.info(`Agent [${m.key}]: Sources ready`);

    m.sources = res;
    m.sourcesTs = m.versionTs;
  }
};