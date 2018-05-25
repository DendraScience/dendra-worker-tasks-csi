const chai = require('chai')
const feathers = require('feathers')
const app = feathers()

const tm = require('@dendra-science/task-machine')
tm.configure({
  // logger: console
})

app.logger = console

app.set('clients', {
  ldmp: {
    opts: {
      host: '128.32.109.75',
      port: 1024
    }
  },
  stan: {
    client: 'test-csi-{key}',
    cluster: 'test-cluster',
    opts: {
      maxPubAcksInflight: 3,
      uri: 'http://localhost:4222'
    }
  }
})

global.assert = chai.assert
global.expect = chai.expect
global.main = {
  app
}
global.tm = tm
