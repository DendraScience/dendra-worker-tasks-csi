const chai = require('chai')
const feathers = require('@feathersjs/feathers')
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
      host: 'dendra-k8s-arroyo-willow', // Requires VPN
      port: 31600
    }
  },
  stan: {
    client: 'test-csi-{key}',
    cluster: 'stan-cluster',
    opts: {
      // Bonsai test server at home
      uri: 'http://192.168.1.60:31242'
      // uri: 'http://localhost:4222'
    }
  }
})

// Create an in-memory Feathers service for state docs
app.use(
  '/state/docs',
  memory({
    id: '_id',
    paginate: {
      default: 200,
      max: 2000
    },
    store: {}
  })
)

global.assert = chai.assert
global.expect = chai.expect
global.main = {
  app
}
global.tm = tm
