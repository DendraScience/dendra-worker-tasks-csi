/**
 * Tests for subscribing to imported records
 */

const STAN = require('node-nats-streaming')

describe('Subscribe to imported records', function () {
  this.timeout(30000)

  let messages = []

  let stan
  let sub

  before(function () {
    const cfg = main.app.get('clients').stan
    stan = STAN.connect(cfg.cluster, cfg.client, cfg.opts || {})

    return new Promise((resolve, reject) => {
      stan.once('connect', () => {
        resolve(stan)
      })
      stan.once('error', err => {
        reject(err)
      })
    })
  })

  after(function () {
    return Promise.all([
      stan ? new Promise((resolve, reject) => {
        stan.removeAllListeners()
        stan.once('close', resolve)
        stan.once('error', reject)
        stan.close()
      }) : null
    ])
  })

  it('should subscribe', function () {
    const opts = stan.subscriptionOptions()

    opts.setMaxInFlight(10)
    opts.setManualAckMode(true)
    opts.setDeliverAllAvailable()
    opts.setAckWait(60 * 1000) //60s

    sub = stan.subscribe('csi.import.v1.out', opts)

    sub.on('message', msg => {
      messages.push(msg.getData())
    })
  })

  it('should receive messages for 5 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
      sub.unsubscribe()

      expect(messages).to.have.lengthOf(10)
    })
  })
})
