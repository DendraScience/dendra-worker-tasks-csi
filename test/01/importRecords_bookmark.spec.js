/**
 * Tests for importRecords tasks
 */

const moment = require('moment')

describe('importRecords tasks w/ bookmark', function () {
  this.timeout(30000)

  const now = new Date()
  const model = {
    props: {},
    state: {
      _id: 'taskMachine-importRecords-current',
      health_check_threshold: 1200,
      source_defaults: {
        some_default: 'default'
      },
      sources: [
        {
          context: {
            org_slug: 'ucnrs',
            some_value: 'value'
          },
          description: 'Test Quail Ridge',
          pub_to_subject: 'csi.import.v1.out',
          spec_options: {
            backfill_seconds: 1296000,
            order_option: 'collected',
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

  Object.defineProperty(model, '$app', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: main.app
  })
  Object.defineProperty(model, 'key', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: 'importRecords'
  })
  Object.defineProperty(model, 'private', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: {}
  })

  let tasks
  let machine

  after(function () {
    return Promise.all([
      model.private.ldmpClient ? model.private.ldmpClient.disconnect() : Promise.resolve(),

      model.private.stan ? new Promise((resolve, reject) => {
        model.private.stan.removeAllListeners()
        model.private.stan.once('close', resolve)
        model.private.stan.once('error', reject)
        model.private.stan.close()
      }) : Promise.resolve()
    ])
  })

  it('should import', function () {
    tasks = require('../../dist').importRecords

    expect(tasks).to.have.property('sources')
  })

  it('should create machine', function () {
    machine = new tm.TaskMachine(model, tasks, {
      helpers: {
        logger: console
      },
      interval: 500
    })

    expect(machine).to.have.property('model')
  })

  it('should run for Quail Ridge TenMin', function () {
    model.scratch = {}

    return machine.clear().start().then(success => {
      expect(success).to.be.true

      // Verify task state
      expect(model).to.have.property('healthCheckReady', true)
      expect(model).to.have.property('ldmpCheckReady', false)
      expect(model).to.have.property('ldmpClientReady', true)
      expect(model).to.have.property('ldmpConnectReady', true)
      expect(model).to.have.property('ldmpDisconnectReady', false)
      expect(model).to.have.property('ldmpSpecifyReady', true)
      expect(model).to.have.property('ldmpSpecReady', true)
      expect(model).to.have.property('sourcesReady', true)
      expect(model).to.have.property('stanCheckReady', false)
      expect(model).to.have.property('stanReady', true)
      expect(model).to.have.property('stateBookmarksReady') // Could be true or false
      expect(model).to.have.property('versionTsReady', false)
    })
  })

  it('should import Quail Ridge TenMin for 15 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 15000)).then(() => {
      // Check for bookmarks
      expect(model).to.have.nested.property('bookmarks.test_quailridge$TenMin')
    })
  })

  it('should assign bookmarks in state', function () {
    model.scratch = {}

    return machine.clear().start().then(success => {
      expect(success).to.be.true

      // Verify task state
      expect(model).to.have.property('healthCheckReady', true)
      expect(model).to.have.property('ldmpCheckReady', false)
      expect(model).to.have.property('ldmpClientReady', false)
      expect(model).to.have.property('ldmpConnectReady', false)
      expect(model).to.have.property('ldmpDisconnectReady', false)
      expect(model).to.have.property('ldmpSpecifyReady', false)
      expect(model).to.have.property('ldmpSpecReady', false)
      expect(model).to.have.property('sourcesReady', false)
      expect(model).to.have.property('stanCheckReady', false)
      expect(model).to.have.property('stanReady', false)
      expect(model).to.have.property('stateBookmarksReady', true)
      expect(model).to.have.property('versionTsReady', false)

      // Check for bookmarks in state
      expect(model).to.have.nested.property('state.bookmarks.0.key', 'test_quailridge$TenMin')
    })
  })

  it('should reconfigure for state change', function () {
    const now = new Date()

    model.scratch = {}
    model.state.sources[0].spec_options = {
      order_option: 'collected'
    }
    model.state.created_at = now
    model.state.updated_at = now

    return machine.clear().start().then(success => {
      expect(success).to.be.true

      // Verify task state
      expect(model).to.have.property('healthCheckReady', true)
      expect(model).to.have.property('ldmpCheckReady', false)
      expect(model).to.have.property('ldmpClientReady', false)
      expect(model).to.have.property('ldmpConnectReady', true)
      expect(model).to.have.property('ldmpDisconnectReady', true)
      expect(model).to.have.property('ldmpSpecifyReady', true)
      expect(model).to.have.property('ldmpSpecReady', true)
      expect(model).to.have.property('sourcesReady', true)
      expect(model).to.have.property('stanCheckReady', false)
      expect(model).to.have.property('stanReady', false)
      expect(model).to.have.property('stateBookmarksReady', true)
      expect(model).to.have.property('versionTsReady', false)

      // Check ldmpSpec
      const bookmark = model.state.bookmarks.find(bm => bm.key === 'test_quailridge$TenMin')

      expect(model).to.have.nested.property('ldmpSpec.0.time_stamp', moment(bookmark.value).utc().format('YYYY MM DD HH:mm:ss.SS'))
      expect(model).to.have.nested.property('ldmpSpec.0.start_option', 'at-time')
    })
  })

  it('should import Quail Ridge Status for 15 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 15000)).then(() => {
      // Check for bookmarks
      expect(model).to.have.nested.property('bookmarks.test_quailridge$TenMin')
    })
  })
})
