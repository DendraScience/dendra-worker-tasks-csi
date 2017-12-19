const ldmp = require('@dendra-science/csi-ldmp-client')
const moment = require('moment')
const request = require('request')
const {MomentEditor} = require('@dendra-science/utils-moment')

function handleRecord (rec) {
  if (!rec) return

  const m = this.model
  const recNbr = rec.recordNumber

  try {
    //
    // Begin standard record validation
    // TODO: Move to helper
    if (typeof recNbr === 'undefined') throw new Error('Record number undefined')

    if (m.specifyStateAt !== m.stateAt) {
      this.log.info(`Mach [${m.key}] Rec [${recNbr}: Deferring`)
      return
    }

    const recordDate = moment(rec.timeString).utcOffset(0, true).utc()

    if (!(recordDate && recordDate.isValid())) throw new Error('Invalid time format')

    const sourceKey = `${rec.station} ${rec.table}`
    const source = m.sources[sourceKey]

    if (!source) throw new Error(`No source found for '${sourceKey}'`)
    // End standard record validation
    //

    // Allow for static fields to be specified for every point
    const row = Object.assign({}, source.load.fields, rec.fields && rec.fields.reduce((obj, field) => {
      if (field.name) obj[field.name.replace(/\W+/g, '_')] = field.value
      return obj
    }, {}))
    const fieldSet = Object.keys(row).filter(key => {
      return (typeof row[key] === 'number') && !Number.isNaN(row[key])
    }).map(key => {
      return `${key}=${row[key]}`
    })

    if (fieldSet.length === 0) throw new Error('Nothing to write')

    const time = source.timeEditor ? source.timeEditor.edit(recordDate).valueOf() : recordDate.valueOf()
    const buf = Buffer.from(`${source.measurementTagSet} ${fieldSet.join(',')} ${time}\n`)

    const requestOpts = {
      body: buf,
      method: 'POST',
      qs: {
        db: source.load.database,
        precision: 'ms'
      },
      url: `${this.influxUrl}/write`
    }

    request(requestOpts, (err, response) => {
      if (err) {
        this.log.error(`Mach [${m.key}] Rec [${recNbr}: ${err.message}`)
      } else if (response.statusCode !== 204) {
        this.log.error(`Mach [${m.key}] Rec [${recNbr}: Non-success status code ${response.statusCode}`)
      } else {
        this.client.ack().catch(err2 => {
          this.log.error(`Mach [${m.key}] Rec [${recNbr}: ${err2.message}`)
        })
      }
    })
  } catch (err) {
    this.log.error(`Mach [${m.key}] Rec [${recNbr}: ${err.message}`)
  }
}

export default {
  client: {
    guard (m) {
      return !m.clientError && !m.private.client
    },
    execute (m) {
      return new ldmp.LDMPClient(m.$app.get('clients').ldmp)
    },
    assign (m, res) {
      const log = m.$app.logger

      log.info(`Mach [${m.key}]: Client ready`)

      m.private.client = res
      m.private.client.on('record', handleRecord.bind({
        client: res,
        influxUrl: m.$app.get('apis').influxDB.url,
        log: m.$app.logger,
        model: m
      }))
    }
  },

  connect: require('./tasks/connect').default,

  connectReset: require('./tasks/connectReset').default,

  database: {
    guard (m) {
      return !m.databaseError &&
        (m.sourcesStateAt === m.stateAt) &&
        (m.databaseStateAt !== m.stateAt)
    },
    execute (m) {
      const log = m.$app.logger
      const influxUrl = m.$app.get('apis').influxDB.url
      const databases = [...new Set(Object.keys(m.sources).map(key => m.sources[key].load.database))]
      const requestOpts = {
        method: 'POST',
        qs: {
          q: databases.map(db => `CREATE DATABASE "${db}"`).join(';')
        },
        url: `${influxUrl}/query`
      }

      log.info(`Mach [${m.key}]: Creating database(s): ${databases.join(', ')}`)

      return new Promise((resolve, reject) => {
        request(requestOpts, (err, response) => err ? reject(err) : resolve(response))
      }).then(response => {
        if (response.statusCode !== 200) throw new Error(`Non-success status code ${response.statusCode}`)

        return true
      }).catch(err => {
        log.error(`Mach [${m.key}]: ${err.message}`)
        throw err
      })
    },
    assign (m) {
      m.databaseStateAt = m.stateAt
    }
  },

  disconnect: require('./tasks/disconnect').default,

  sources: {
    guard (m) {
      return !m.sourcesError &&
        m.state.sources && (m.state.sources.length > 0) &&
        (m.sourcesStateAt !== m.stateAt)
    },
    execute () { return true },
    assign (m) {
      const log = m.$app.logger

      log.info(`Mach [${m.key}]: Sources ready`)

      m.sources = m.state.sources.reduce((sources, src) => {
        if (src.station && src.table && src.load && src.load.database && src.load.measurement) {
          const sourceKey = `${src.station} ${src.table}`
          const source = sources[sourceKey] = Object.assign({}, src)

          // Concat the leftmost part of the Line Protocol string for loading
          const parts = [source.load.measurement]
          if (source.load.tags) {
            // Allow for static tags to be specified for every point
            Object.keys(source.load.tags).forEach(key => parts.push(`${key}=${source.load.tags[key]}`))
          }
          source.measurementTagSet = parts.join(',')

          if (source.transform && source.transform.time_edit) {
            // Create a MomentEditor instance for adjusting timestamps
            source.timeEditor = new MomentEditor(source.transform.time_edit)
          }

          if (source.transform && source.transform.reverse_time_edit) {
            // Create a MomentEditor instance for adjusting timestamps
            source.reverseTimeEditor = new MomentEditor(source.transform.reverse_time_edit)
          }
        }

        return sources
      }, {})

      m.sourcesStateAt = m.stateAt
    }
  },

  specs: {
    guard (m) {
      return !m.specsError &&
        (m.databaseStateAt === m.stateAt) &&
        (m.specsStateAt !== m.stateAt)
    },
    async execute (m) {
      const influxUrl = m.$app.get('apis').influxDB.url
      const specs = []

      for (let sourceKey of Object.keys(m.sources)) {
        const {options, station, table, load, reverseTimeEditor} = m.sources[sourceKey]
        const spec = Object.assign({
          station,
          table
        }, options)

        const requestOpts = {
          method: 'POST',
          qs: {
            db: load.database,
            q: `SELECT * FROM "${load.measurement}" ORDER BY time DESC LIMIT 1`
          },
          url: `${influxUrl}/query`
        }
        const response = await new Promise((resolve, reject) => {
          request(requestOpts, (err, resp) => err ? reject(err) : resolve(resp))
        })

        if (response.statusCode !== 200) throw new Error(`Non-success status code ${response.statusCode}`)

        const body = JSON.parse(response.body)

        try {
          const recordDate = moment(body.results[0].series[0].values[0][0]).utc()
          const timeStamp = reverseTimeEditor ? reverseTimeEditor.edit(recordDate) : recordDate
          spec.time_stamp = timeStamp.format('YYYY MM DD HH:mm:ss.SS')
          spec.start_option = 'at-time'
        } catch (e) {
          spec.start_option = 'at-oldest'
        }

        specs.push(spec)
      }

      return specs
    },
    assign (m, res) {
      const log = m.$app.logger

      log.info(`Mach [${m.key}]: Specs ready`)

      m.specs = res
      m.specsStateAt = m.stateAt
    }
  },

  specify: require('./tasks/specify').default,

  stateAt: require('./tasks/stateAt').default
}
