/**
 * Create an LDMP client if not defined. Add an event listener for records.
 */

const ldmp = require('@dendra-science/csi-ldmp-client')
const moment = require('moment')

async function publish ({logger, m, rec, recordNumber, source, stan}) {
  const subject = source.pub_to_subject

  logger.info('Publishing', {recordNumber, subject})

  try {
    const msgStr = JSON.stringify({
      context: Object.assign({
        imported_at: new Date()
      }, source.context),
      payload: rec
    })
    const guid = await new Promise((resolve, reject) => {
      stan.publish(subject, msgStr, (err, guid) => err ? reject(err) : resolve(guid))
    })

    logger.info('Published', {recordNumber, guid, subject})
  } catch (err) {
    logger.error('Publish error', {recordNumber, err, subject})
  }
}

function handleRecord (rec) {
  const {logger, m} = this

  if (!rec) {
    logger.error('Record undefined')
    return
  }

  const {recordNumber} = rec

  if (typeof recordNumber === 'undefined') {
    logger.error('Record number undefined')
    return
  }

  try {
    const {ldmpClient, stan} = m.private

    logger.info('Record received', {recordNumber})

    if (m.ldmpSpecifyTs !== m.versionTs) {
      logger.info('Record deferred', {recordNumber})
      return
    }

    const recordDate = moment(rec.timeString).utcOffset(0, true).utc()

    if (!(recordDate && recordDate.isValid())) throw new Error('Invalid time format')

    const sourceKey = `${rec.station}$$${rec.table}`
    const source = m.sources[sourceKey]

    if (!source) throw new Error(`No source found for '${sourceKey}'`)

    publish({logger, m, rec, recordNumber, source, stan}).then(() => {
      logger.info('Record ack', {recordNumber})

      return ldmpClient.ack()
    }).catch(err => {
      logger.error('Record ack error', {recordNumber, err})
    }).then(() => {
      logger.info('Record ack sent', {recordNumber})

      m.healthCheckTs = new Date()

      if (!m.bookmarks) m.bookmarks = {}
      m.bookmarks[sourceKey] = recordDate.valueOf()
    }).catch(err => {
      logger.error('Record bookmark error', {recordNumber, err})
    })
  } catch (err) {
    logger.error('Record error', {recordNumber, err})
  }
}

module.exports = {
  guard (m) {
    return !m.ldmpClientError &&
      !m.private.ldmpClient
  },

  execute (m) {
    const cfg = m.$app.get('clients').ldmp

    return new ldmp.LDMPClient(cfg.opts || {})
  },

  assign (m, res, {logger}) {
    res.on('record', handleRecord.bind({logger, m}))

    m.private.ldmpClient = res

    logger.info('LDMP client ready')
  }
}
