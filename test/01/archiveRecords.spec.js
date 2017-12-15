/**
 * Tests for archiveRecords tasks
 */

const util = require('util')

describe('archiveRecords tasks', function () {
  this.timeout(60000)

  const jsonArchive = main.app.get('connections').jsonArchive
  const model = {
    $app: main.app,
    _id: 'archiveRecords',
    props: {},
    state: {
      _id: 'taskMachine-archiveRecords-current',
      sources: [
        {
          station: 'test_blueoak',
          table: 'TenMin',
          options: {
            order_option: 'collected'
          },
          description: 'Test Blue Oak',
          transform: {
            time_edit: 'ad_8_h'
          }
        }
      ],
      updated_at: new Date()
    }
  }

  let tasks
  let machine

  after(function () {
     return model.client && model.client.isConnected && model.client.disconnect()
  })

  it('should import', function () {
    tasks = require('../../dist').archiveRecords

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
      expect(machine.model).to.have.property('disconnectReady', false)
      expect(machine.model).to.have.property('sourcesReady', true)
      expect(machine.model).to.have.property('specsReady', true)
      expect(machine.model).to.have.property('specifyReady', true)
      expect(machine.model).to.have.property('stampsReady', true)
    })
  })

  it('should archive Blue Oak TenMin for 5 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
      return jsonArchive.app.service('/categories').find({
        query: {
          parent_category_id: 'csi-test_blueoak-tenmin'
        }
      })
    }).then(res => {
      expect(res.data).to.have.lengthOf.at.least(1)
    })
  })

  it('should reconfig for Blue Oak Status', function () {
    model.scratch = {}
    model.state = {
      _id: 'taskMachine-archiveRecords-current',
      sources: [
        {
          station: 'test_blueoak',
          table: 'Status',
          options: {
            order_option: 'collected'
          },
          description: 'Test Blue Oak',
          transform: {
            time_edit: 'ad_8_h'
          }
        }
      ],
      updated_at: new Date()
    }

    return machine.clear().start().then(success => {
      expect(success).to.be.true

      expect(machine.model).to.have.property('clientReady', false)
      expect(machine.model).to.have.property('connectReady', true)
      expect(machine.model).to.have.property('disconnectReady', true)
      expect(machine.model).to.have.property('sourcesReady', true)
      expect(machine.model).to.have.property('specsReady', true)
      expect(machine.model).to.have.property('specifyReady', true)
      expect(machine.model).to.have.property('stampsReady', true)
    })
  })

  it('should archive Blue Oak Status for 5 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
      return jsonArchive.app.service('/categories').find({
        query: {
          parent_category_id: 'csi-test_blueoak-status'
        }
      })
    }).then(res => {
      expect(res.data).to.have.lengthOf.at.least(1)
    })
  })
})
