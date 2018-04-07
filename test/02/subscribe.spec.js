/**
 * Tests for subscribing to imported records
 */

const STAN = require('node-nats-streaming')

describe.skip('Subscribe to imported records', function () {
  this.timeout(30000)

  let messages = []

  let stan
  let sub

  before(function () {
    const cfg = main.app.get('clients').stan
    stan = STAN.connect(cfg.cluster, 'test-csi-subscribe', cfg.opts || {})

    return new Promise((resolve, reject) => {
      stan.once('connect', () => {
        resolve(stan)
      })
      stan.once('error', err => {
        reject(err)
      })
    }).then(() => {
      return new Promise(resolve => setTimeout(resolve, 1000))
    })
  })

  after(function () {
    return Promise.all([
      stan ? new Promise((resolve, reject) => {
        stan.removeAllListeners()
        stan.once('close', resolve)
        stan.once('error', reject)
        stan.close()
      }) : Promise.resolve()
    ])
  })

  it('should subscribe', function () {
    const opts = stan.subscriptionOptions()

    opts.setDeliverAllAvailable()
    opts.setMaxInFlight(10)

    sub = stan.subscribe('csi.import.v1.out', opts)

    sub.on('message', msg => {
      messages.push(msg.getData())
    })
  })

  it('should receive messages for 5 seconds', function () {
    return new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
      return new Promise(resolve => {
        sub.once('unsubscribed', resolve)
        sub.unsubscribe()
      })
    }).then(() => {
      expect(messages).to.have.lengthOf(10)
    })
  })
})
