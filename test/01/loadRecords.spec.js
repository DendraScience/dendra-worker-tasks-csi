/**
 * Tests for loadRecords tasks
 */

const request = require('request')
const util = require('util')

describe('loadRecords tasks', function () {
  this.timeout(60000)

  const influxUrl = main.app.get('apis').influxDB.url
  const jsonArchive = main.app.get('connections').jsonArchive
  const now = new Date()
  const model = {
    $app: main.app,
    _id: 'loadRecords',
    private: {},
    props: {},
    state: {
      _id: 'taskMachine-loadRecords-current',
      sources: [
        {
          station: 'test_blueoak',
          table: 'TenMin',
          options: {
            order_option: 'collected'
          },
          description: 'Test Blue Oak',
          transform: {
            time_edit: 'ad_8_h',
            reverse_time_edit: 'su_8_h'
          },
          load: {
            database: 'station_blue_oak',
            measurement: 'ten_minute_data'
          }
        }
      ],
      created_at: now,
      updated_at: now
    }
  }

  let tasks
  let machine

  after(function () {
     return model.private.client && model.private.client.isConnected && model.private.client.disconnect()
  })

  it('should import', function () {
    tasks = require('../../dist').loadRecords

    expect(tasks).to.have.property('client')
  })

  it('should create machine', function () {
    machine = new tm.TaskMachine(model, tasks, {
      interval: -1
    })

    expect(machine).to.have.property('model')
  })

  it('should run for Blue Oak TenMin', function () {
    model.scratch = {}

    return machine.clear().start().then(success => {
      expect(success).to.be.true

      expect(machine.model).to.have.property('clientReady', true)
      expect(machine.model).to.have.property('connectReady', true)
      expect(machine.model).to.have.property('databaseReady', true)
      expect(machine.model).to.have.property('disconnectReady', false)
      expect(machine.model).to.have.property('sourcesReady', true)
      expect(machine.model).to.have.property('specsReady', true)
      expect(machine.model).to.have.property('specifyReady', true)
    })
  })

  it('should load Blue Oak TenMin for 5 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
      const requestOpts = {
        method: 'POST',
        qs: {
          db: 'station_blue_oak',
          q: `SELECT COUNT(*) FROM "ten_minute_data"`
        },
        url: `${influxUrl}/query`
      }
      return new Promise((resolve, reject) => {
        request(requestOpts, (err, resp) => err ? reject(err) : resolve(resp))
      })
    }).then(response => {
      if (response.statusCode !== 200) throw new Error(`Non-success status code ${response.statusCode}`)
      return JSON.parse(response.body)
    }).then(body => {
      expect(body).to.have.nested.property('results.0.series.0.values.0.0')
    })
  })

  it('should reconfig for Blue Oak Status', function () {
    const now = new Date()

    model.scratch = {}
    model.state = {
      _id: 'taskMachine-loadRecords-current',
      sources: [
        {
          station: 'test_blueoak',
          table: 'Status',
          options: {
            order_option: 'collected'
          },
          description: 'Test Blue Oak',
          transform: {
            time_edit: 'ad_8_h',
            reverse_time_edit: 'su_8_h'
          },
          load: {
            database: 'station_blue_oak',
            measurement: 'status_data'
          }
        }
      ],
      created_at: now,
      updated_at: now
    }

    return machine.clear().start().then(success => {
      expect(success).to.be.true

      expect(machine.model).to.have.property('clientReady', false)
      expect(machine.model).to.have.property('connectReady', true)
      expect(machine.model).to.have.property('databaseReady', true)
      expect(machine.model).to.have.property('disconnectReady', true)
      expect(machine.model).to.have.property('sourcesReady', true)
      expect(machine.model).to.have.property('specsReady', true)
      expect(machine.model).to.have.property('specifyReady', true)
    })
  })

  it('should load Blue Oak Status for 5 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
      const requestOpts = {
        method: 'POST',
        qs: {
          db: 'station_blue_oak',
          q: `SELECT COUNT(*) FROM "status_data"`
        },
        url: `${influxUrl}/query`
      }
      return new Promise((resolve, reject) => {
        request(requestOpts, (err, resp) => err ? reject(err) : resolve(resp))
      })
    }).then(response => {
      if (response.statusCode !== 200) throw new Error(`Non-success status code ${response.statusCode}`)
      return JSON.parse(response.body)
    }).then(body => {
      expect(body).to.have.nested.property('results.0.series.0.values.0.0')
    })
  })
})
