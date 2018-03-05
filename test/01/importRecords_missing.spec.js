/**
 * Tests for loadRecords tasks w/ records missing
 */

describe('importRecords tasks w/ records missing', function () {
  this.timeout(30000)

  const now = new Date()
  const model = {
    $app: main.app,
    key: 'importRecords',
    private: {},
    props: {},
    state: {
      _id: 'taskMachine-importRecords-current',
      defaults: {
        record_missing_threshold: 2
      },
      sources: [
        {
          context: {
            some: 'value'
          },
          description: 'Test Quail Ridge',
          pub_to_subject: 'csi.import.v1.out',
          spec_options: {
            backfill_seconds: 1200,
            order_option: 'logged-with-holes',
            start_option: 'relative-to-newest'
          },
          station: 'test_quailridge',
          table: 'TenMin'
        }
      ],
      created_at: now,
      updated_at: now
    }
  }

  let tasks
  let machine

  after(function () {
    return Promise.all([
      model.private.ldmpClient ? model.private.ldmpClient.disconnect() : null,

      model.private.stan ? new Promise((resolve, reject) => {
        model.private.stan.removeAllListeners()
        model.private.stan.once('close', resolve)
        model.private.stan.once('error', reject)
        model.private.stan.close()
      }) : null
    ])
  })

  it('should import', function () {
    tasks = require('../../dist').importRecords

    expect(tasks).to.have.property('ldmpClient')
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

      // Verify task state
      expect(machine.model).to.have.property('ldmpClientReady', true)
      expect(machine.model).to.have.property('ldmpConnectReady', true)
      expect(machine.model).to.have.property('ldmpDisconnectReady', false)
      expect(machine.model).to.have.property('ldmpSpecReady', true)
      expect(machine.model).to.have.property('ldmpSpecifyReady', true)
      expect(machine.model).to.have.property('ldmpWatchReady', false)
      expect(machine.model).to.have.property('recordMissingReady', true)
      expect(machine.model).to.have.property('sourcesReady', true)
      expect(machine.model).to.have.property('stanReady', true)
      expect(machine.model).to.have.property('stanWatchReady', false)
      expect(machine.model).to.have.property('stateBookmarksReady', false)
      expect(machine.model).to.have.property('versionTsReady', false)

      // Check for defaults
      expect(machine.model).to.have.nested.property('sources.test_quailridge$$TenMin.record_missing_threshold', 2)
    })
  })

  it('should import Quail Ridge TenMin for 5 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
      return machine.clear().start()
    }).then(success => {
      expect(success).to.be.true

      // Verify task state
      expect(machine.model).to.have.property('ldmpClientReady', false)
      expect(machine.model).to.have.property('ldmpConnectReady', true)
      expect(machine.model).to.have.property('ldmpDisconnectReady', true)
      expect(machine.model).to.have.property('ldmpSpecReady', false)
      expect(machine.model).to.have.property('ldmpSpecifyReady', true)
      expect(machine.model).to.have.property('ldmpWatchReady', false)
      expect(machine.model).to.have.property('recordMissingReady', true)
      expect(machine.model).to.have.property('sourcesReady', false)
      expect(machine.model).to.have.property('stanReady', false)
      expect(machine.model).to.have.property('stanWatchReady', false)
      expect(machine.model).to.have.property('stateBookmarksReady', true)
      expect(machine.model).to.have.property('versionTsReady', false)
    })
  })
})
