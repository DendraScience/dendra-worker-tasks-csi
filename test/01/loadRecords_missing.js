/**
 * Tests for loadRecords tasks
 */

const request = require('request')
const util = require('util')

describe('loadRecords tasks w/ records missing', function () {
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
            backfill_seconds: 1200,
            order_option: 'collected',
            start_option: 'relative-to-newest'
          },
          description: 'Test Quail Ridge',
          transform: {
            time_edit: 'ad_8_h',
            reverse_time_edit: 'su_8_h'
          },
          record_missing_threshold: 5,
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
      expect(machine.model).to.have.property('recordMissingReady', true)
      expect(machine.model).to.have.property('sourcesReady', true)
      expect(machine.model).to.have.property('specsReady', true)
      expect(machine.model).to.have.property('specifyReady', true)
    })
  })

  it('should load Quail Ridge TenMin for 10 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 10000)).then(() => {
      return machine.clear().start()
    }).then(success => {
      expect(success).to.be.true

      expect(machine.model).to.have.property('clientReady', false)
      expect(machine.model).to.have.property('connectReady', true)
      expect(machine.model).to.have.property('databaseReady', false)
      expect(machine.model).to.have.property('disconnectReady', true)
      expect(machine.model).to.have.property('recordMissingReady', true)
      expect(machine.model).to.have.property('sourcesReady', false)
      expect(machine.model).to.have.property('specsReady', false)
      expect(machine.model).to.have.property('specifyReady', true)
    }).then(() => {
      return new Promise(resolve => setTimeout(resolve, 5000))
    })
  })
})
