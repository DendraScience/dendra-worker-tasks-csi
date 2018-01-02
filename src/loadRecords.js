const ldmp = require('@dendra-science/csi-ldmp-client')
const moment = require('moment')
const request = require('request')
const {MomentEditor} = require('@dendra-science/utils-moment')

function handleRecord (rec) {
  if (!rec) return

  const m = this.model
  const recordNumber = rec.recordNumber

  try {
    //
    // Begin standard record validation
    // TODO: Move to helper
    if (typeof recordNumber === 'undefined') throw new Error('Record number undefined')

    if (m.specifyStateAt !== m.stateAt) {
      this.log.info(`Mach [${m.key}] Rec [${recordNumber}]: Deferring`)
      return
    }

    const recordDate = moment(rec.timeString).utcOffset(0, true).utc()

    if (!(recordDate && recordDate.isValid())) throw new Error('Invalid time format')

    const sourceKey = `${rec.station} ${rec.table}`
    const source = m.sources[sourceKey]

    if (!source) throw new Error(`No source found for '${sourceKey}'`)
    // End standard record validation
    //

    /*
      Construct the following in order to write a point to InfluxDB:
      1. The fieldSet
      2. The measurementTagSet
      3. The time (in milliseconds)
      4. The Line Protocol buffer string (buf)
     */

    //
    // 1. The fieldSet
    //

    // Allow for static fields to be specified for every point
    const row = Object.assign({}, source.load.fields, rec.fields && rec.fields.reduce((obj, field) => {
      if (field.name) obj[field.name.replace(/\W+/g, '_')] = field.value
      return obj
    }, {}))

    // Add the record number to the row
    row.record_number = recordNumber

    const fieldSet = Object.keys(row).filter(key => {
      // TODO: Improve type handling
      return (typeof row[key] === 'number') && !Number.isNaN(row[key])
    }).map(key => {
      return `${key}=${row[key]}`
    })

    if (fieldSet.length === 0) throw new Error('Nothing to write')

    //
    // 2. The measurementTagSet
    //

    const measurementTagSet = [...source.measurementTagSet]

    // Allow for time-based tags to be specified for every point
    const tagDate = source.tagTimeEditor ? source.tagTimeEditor.edit(recordDate) : recordDate
    const timeTags = source.load.time_tags

    if (timeTags) Object.keys(timeTags).forEach(key => measurementTagSet.push(`${key}=${tagDate.format(timeTags[key])}`))

    //
    // 3. The time (in milliseconds)
    //

    // Transform the record timestamp
    let editedDate = source.timeEditor ? source.timeEditor.edit(recordDate) : recordDate

    // Transform the record timestamp if a matching exception is found
    const exceptions = source.transform_exceptions
    if (exceptions) {
      const exception = exceptions.find(exception => {
        const ba = exception.begins_at
        const ea = exception.ends_at

        return ba && ea &&
          ba.record_time && ea.record_time &&
          (recordDate.isBetween(ba.record_time, ea.record_time, null, '[]')) &&
          (recordNumber >= ba.record_number) && (recordNumber <= ea.record_number)
      })

      if (exception) editedDate = exception.timeEditor.edit(recordDate)
    }

    const time = editedDate.valueOf()

    //
    // 4. The Line Protocol buffer string (buf)
    //

    const buf = Buffer.from(`${measurementTagSet.join(',')} ${fieldSet.join(',')} ${time}\n`)

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
        this.log.error(`Mach [${m.key}] Rec [${recordNumber}]: ${err.message}`)
      } else if (response.statusCode !== 204) {
        this.log.error(`Mach [${m.key}] Rec [${recordNumber}]: Non-success status code ${response.statusCode}`)
      } else {
        this.client.ack().catch(err2 => {
          this.log.error(`Mach [${m.key}] Rec [${recordNumber}]: ${err2.message}`)
        })
      }
    })
  } catch (err) {
    this.log.error(`Mach [${m.key}] Rec [${recordNumber}]: ${err.message}`)
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

          // Prepare the leftmost parts of the Line Protocol string for loading
          const measurementTagSet = source.measurementTagSet = [source.load.measurement]

          // Allow for static tags to be specified for every point
          const tags = source.load.tags
          if (tags) Object.keys(tags).forEach(key => measurementTagSet.push(`${key}=${tags[key]}`))

          const transform = source.transform
          if (transform) {
            // Create MomentEditor instances for adjusting timestamps
            if (transform.time_edit) source.timeEditor = new MomentEditor(transform.time_edit)
            if (transform.reverse_time_edit) source.reverseTimeEditor = new MomentEditor(transform.reverse_time_edit)
            if (transform.tag_time_edit) source.tagTimeEditor = new MomentEditor(transform.tag_time_edit)
          }

          const exceptions = source.transform_exceptions
          if (exceptions) {
            // Create MomentEditor instances for adjusting the timestamp on specific records
            exceptions.forEach(exception => {
              if (exception.time_edit) exception.timeEditor = new MomentEditor(exception.time_edit)
            })
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

        if (!spec.start_option) {
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
            const recentDate = moment(body.results[0].series[0].values[0][0]).utc()
            const timeStamp = reverseTimeEditor ? reverseTimeEditor.edit(recentDate) : recentDate
            spec.time_stamp = timeStamp.format('YYYY MM DD HH:mm:ss.SS')
            spec.start_option = 'at-time'
          } catch (e) {
            spec.start_option = 'at-oldest'
          }
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
