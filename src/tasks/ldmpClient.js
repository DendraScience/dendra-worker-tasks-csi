/**
 * Create an LDMP client if not defined. Add an event listener for records.
 */

const ldmp = require('@dendra-science/csi-ldmp-client')
const moment = require('moment')

async function processItem (
  {context, pubSubject, rec, recordNumber, stan},
  {logger}) {
  /*
    Prepare outbound message and publish.
   */

  const msgStr = JSON.stringify({
    context: Object.assign({}, context, {
      imported_at: new Date()
    }),
    payload: rec
  })

  const guid = await new Promise((resolve, reject) => {
    stan.publish(pubSubject, msgStr, (err, guid) => err ? reject(err) : resolve(guid))
  })

  logger.info('Published', {recordNumber, pubSubject, guid})
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

  logger.info('Record received', {recordNumber})

  if (m.ldmpSpecifyTs !== m.versionTs) {
    logger.info('Record deferred', {recordNumber})
    return
  }

  try {
    const recordDate = moment(rec.timeString).utcOffset(0, true).utc()

    if (!(recordDate && recordDate.isValid())) throw new Error('Invalid time format')

    const sourceKey = `${rec.station.replace(/\W/g, '_')}$${rec.table.replace(/\W/g, '_')}`
    const source = m.sources[sourceKey]

    if (!source) throw new Error(`No source found for '${sourceKey}'`)

    const {ldmpClient, stan} = m.private
    const {
      context,
      pub_to_subject: pubSubject
    } = source

    processItem({context, pubSubject, rec, recordNumber, stan}, this).then(() => ldmpClient.ack()).then(() => {
      m.healthCheckTs = new Date()

      if (!m.bookmarks) m.bookmarks = {}

      const curVal = m.bookmarks[sourceKey]
      const newVal = recordDate.valueOf()

      m.bookmarks[sourceKey] = typeof curVal === 'undefined' ? newVal : Math.max(curVal, newVal)
    }).catch(err => {
      logger.error('Record processing error', {recordNumber, err, rec})
    })
  } catch (err) {
    logger.error('Record error', {recordNumber, err, rec})
  }
}

module.exports = {
  guard (m) {
    return !m.ldmpClientError &&
      !m.private.ldmpClient
  },

  execute (m) {
    const cfg = Object.assign({
      opts: {}
    }, m.$app.get('clients').ldmp, m.props.ldmp)

    return new ldmp.LDMPClient(cfg.opts)
  },

  assign (m, res, {logger}) {
    res.on('closed', () => {
      logger.info('LDMP client closed')
    })
    res.on('connected', () => {
      logger.info('LDMP client connected')
    })
    res.on('disconnected', () => {
      logger.info('LDMP client disconnected')
    })
    res.on('record', handleRecord.bind({
      logger,
      m
    }))

    m.private.ldmpClient = res

    logger.info('LDMP client ready')
  }
}
