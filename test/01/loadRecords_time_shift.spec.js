/**
 * Tests for loadRecords tasks
 */

const request = require('request')
const util = require('util')

describe.skip('loadRecords tasks', function () {
  this.timeout(60000)

  const influxUrl = main.app.get('apis').influxDB.url
  const jsonArchive = main.app.get('connections').jsonArchive
  const now = new Date()
  const model = {
    $app: main.app,
    key: 'loadRecords',
    private: {},
    props: {},
    state: {
      _id: 'taskMachine-loadRecords-current',
      sources: [
        {
          station: 'test_quailridge',
          table: 'TenMin',
          options: {
            order_option: 'collected',
            start_option: 'at-time',
            time_stamp: '2017 12 28 00:00:00.00'
          },
          description: 'Test Quail Ridge',
          transform: {
            time_edit: 'ad_8_h',
            reverse_time_edit: 'su_8_h'
          },
          transform_exceptions: [
            {
              begins_at: {
                record_number: 0,
                record_time: new Date('2016-06-02T00:00:00Z')
              },
              ends_at: {
                record_number: 13420,
                record_time: new Date('2017-12-28T18:20:00Z')
              },
              time_edit: 'ad_6_h'
            }
          ],
          load: {
            database: 'station_quail_ridge',
            measurement: 'ten_minute_data',
            time_tags: {
              month: 'MM',
              year: 'YYYY'
            }
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
     return model.private.client && model.private.client.disconnect()
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

  it('should run for Quail Ridge TenMin', function () {
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

  it('should load Quail Ridge TenMin for 30 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 30000)).then(() => {
      const requestOpts = {
        method: 'POST',
        qs: {
          db: 'station_quail_ridge',
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
})
