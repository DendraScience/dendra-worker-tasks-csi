/**
 * Prepare LDMP client spec in the model if not defined, and after sources are ready.
 */

module.exports = {
  guard (m) {
    return !m.ldmpSpecError &&
      (m.sourcesTs === m.versionTs) &&
      (m.ldmpSpecTs !== m.versionTs)
  },

  execute (m) {
    return Object.keys(m.sources).map(sourceKey => {
      const {spec_options: options, station, table} = m.sources[sourceKey]

      return Object.assign({
        station,
        table
      }, options)
    })
  },

  assign (m, res) {
    const log = m.$app.logger

    log.info(`Agent [${m.key}]: LDMP client spec ready`)

    m.ldmpSpec = res
    m.ldmpSpecTs = m.versionTs
  }
}
