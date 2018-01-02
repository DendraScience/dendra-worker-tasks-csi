const chai = require('chai')
const feathers = require('feathers')
const restClient = require('feathers-rest/client')
const request = require('request')
const app = feathers()

const tm = require('@dendra-science/task-machine')
tm.configure({
  logger: console
})

// For dev:   'http://localhost:3033'
// For local: 'http://localhost:8080/_services/archive/json/api/v1'
const JSON_ARCHIVE_API_URL = 'http://localhost:3033'

app.logger = console

app.set('clients', {
  ldmp: {
    host: '128.32.109.75',
    port: 1024
  }
})

app.set('connections', {
  jsonArchive: {
    app: feathers().configure(restClient(JSON_ARCHIVE_API_URL).request(request))
  }
})

app.set('apis', {
  influxDB: {
    url: 'http://localhost:8086'
  }
})

global.assert = chai.assert
global.expect = chai.expect
global.main = {
  app
}
global.tm = tm
