/**
 * Tests for importRecords tasks
 */

const moment = require('moment')

describe('importRecords tasks', function () {
  this.timeout(60000)

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
          backfill: {
            hours: 72
          },
          context: {
            org_slug: 'cdfw',
            some_value: 'value'
          },
          description: 'Test Upper Butte Basin',
          pub_to_subject: 'csi.importRecords.out',
          spec_options: {
            order_option: 'logged-with-holes'
          },
          station: 'UpperButteBasin',
          table: 'Min10'
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
  let bookmark

  after(function () {
    return Promise.all([
      model.private.ldmpClient
        ? model.private.ldmpClient.disconnect()
        : Promise.resolve(),

      model.private.stan
        ? new Promise((resolve, reject) => {
            model.private.stan.removeAllListeners()
            model.private.stan.once('close', resolve)
            model.private.stan.once('error', reject)
            model.private.stan.close()
          })
        : Promise.resolve()
    ])
  })

  it('should import', function () {
    tasks = require('../../../dist').importRecords

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

  it('should run', function () {
    model.scratch = {}

    return machine
      .clear()
      .start()
      .then(success => {
        /* eslint-disable-next-line no-unused-expressions */
        expect(success).to.be.true

        // Verify task state
        expect(model).to.have.property('healthCheckReady', true)
        expect(model).to.have.property('ldmpCheckReady', false)
        expect(model).to.have.property('ldmpClientReady', true)
        expect(model).to.have.property('ldmpConnectReady', true)
        expect(model).to.have.property('ldmpDisconnectReady', false)
        expect(model).to.have.property('ldmpSpecifyReady', true)
        expect(model).to.have.property('ldmpSpecReady', true)
        expect(model).to.have.property('saveBookmarksReady') // Could be true or false
        expect(model).to.have.property('sourcesReady', true)
        expect(model).to.have.property('stanCheckReady', false)
        expect(model).to.have.property('stanReady', true)
        expect(model).to.have.property('versionTsReady', false)

        // Check for defaults
        expect(model).to.have.nested.property(
          'sources.UpperButteBasin$Min10.some_default',
          'default'
        )
      })
  })

  it('should wait for 5 seconds to collect data', function () {
    return new Promise(resolve => setTimeout(resolve, 5000))
  })

  it('should save bookmarks', function () {
    model.scratch = {}

    return machine
      .clear()
      .start()
      .then(success => {
        /* eslint-disable-next-line no-unused-expressions */
        expect(success).to.be.true

        // Verify task state
        expect(model).to.have.property('healthCheckReady', true)
        expect(model).to.have.property('ldmpCheckReady', false)
        expect(model).to.have.property('ldmpClientReady', false)
        expect(model).to.have.property('ldmpConnectReady', false)
        expect(model).to.have.property('ldmpDisconnectReady', false)
        expect(model).to.have.property('ldmpSpecifyReady', false)
        expect(model).to.have.property('ldmpSpecReady', false)
        expect(model).to.have.property('saveBookmarksReady', true)
        expect(model).to.have.property('sourcesReady', false)
        expect(model).to.have.property('stanCheckReady', false)
        expect(model).to.have.property('stanReady', false)
        expect(model).to.have.property('versionTsReady', false)
      })
  })

  it('should get saved bookmarks', function () {
    return main.app
      .service('/state/docs')
      .get('importRecords-bookmarks')
      .then(doc => {
        expect(doc).to.have.property('_id', 'importRecords-bookmarks')
        expect(doc).to.have.nested.property(
          'bookmarks.0.key',
          'UpperButteBasin$Min10'
        )
        expect(doc).to.have.nested.property('bookmarks.0.value').above(0)

        bookmark = doc.bookmarks[0]
      })
  })

  it('should reconfigure', function () {
    const now = new Date()

    model.scratch = {}
    model.state.created_at = now

    return machine
      .clear()
      .start()
      .then(success => {
        /* eslint-disable-next-line no-unused-expressions */
        expect(success).to.be.true

        // Verify task state
        expect(model).to.have.property('healthCheckReady', true)
        expect(model).to.have.property('ldmpCheckReady', false)
        expect(model).to.have.property('ldmpClientReady', false)
        expect(model).to.have.property('ldmpConnectReady', true)
        expect(model).to.have.property('ldmpDisconnectReady', true)
        expect(model).to.have.property('ldmpSpecifyReady', true)
        expect(model).to.have.property('ldmpSpecReady', true)
        expect(model).to.have.property('saveBookmarksReady') // Could be true or false
        expect(model).to.have.property('sourcesReady', true)
        expect(model).to.have.property('stanCheckReady', false)
        expect(model).to.have.property('stanReady', false)
        expect(model).to.have.property('versionTsReady', false)
      })
  })

  it('should use bookmark to assign spec', function () {
    expect(model.ldmpSpec).to.have.nested.property(
      '0.time_stamp',
      moment(bookmark.value).utc().format('YYYY MM DD HH:mm:ss.SS')
    )
  })

  it('should wait for 5 seconds to collect data', function () {
    return new Promise(resolve => setTimeout(resolve, 5000))
  })

  it('should defer records', function () {
    delete model.versionTs
  })
})
