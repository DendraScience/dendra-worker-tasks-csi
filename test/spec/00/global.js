const chai = require('chai')
const feathers = require('feathers')
const memory = require('feathers-memory')
const app = feathers()

const tm = require('@dendra-science/task-machine')
tm.configure({
  // logger: console
})

app.logger = console

app.set('clients', {
  ldmp: {
    opts: {
      host: 'wanda.berkeley.edu', // Requires VPN
      port: 1024
    }
  },
  stan: {
    client: 'test-csi-{key}',
    cluster: 'test-cluster',
    opts: {
      uri: 'http://localhost:4222'
    }
  }
})

// Create an in-memory Feathers service for state docs
app.use('/state/docs', memory({
  id: '_id',
  paginate: {
    default: 200,
    max: 2000
  },
  store: {
  }
}))

global.assert = chai.assert
global.expect = chai.expect
global.main = {
  app
}
global.tm = tm
