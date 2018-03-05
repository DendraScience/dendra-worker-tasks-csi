'use strict';

/**
 * Create an LDMP client if not defined. Add an event listener for records.
 */

const ldmp = require('@dendra-science/csi-ldmp-client');
const moment = require('moment');

async function publish({ log, m, rec, recordNumber, source, stan }) {
  const subject = source.pub_to_subject;

  log.info(`Agent [${m.key}] Rec [${recordNumber}]: Publishing to: ${subject}`);

  const msgStr = JSON.stringify({
    context: Object.assign({
      imported_at: new Date()
    }, source.context),
    payload: rec
  });
  const guid = await new Promise((resolve, reject) => {
    stan.publish(subject, msgStr, (err, guid) => err ? reject(err) : resolve(guid));
  });

  log.info(`Agent [${m.key}] Rec [${recordNumber}]: Published ${guid} to ${subject}`);
}

function handleRecord(rec) {
  const m = this;
  const log = m.$app.logger;

  if (!rec) {
    log.error(`Agent [${m.key}]: Record undefined`);
    return;
  }

  const recordNumber = rec.recordNumber;

  if (typeof recordNumber === 'undefined') {
    log.error(`Agent [${m.key}]: Record number undefined`);
    return;
  }

  try {
    const { ldmpClient, stan } = m.private;

    log.info(`Agent [${m.key}] Rec [${recordNumber}]: Received`);

    if (m.ldmpSpecifyTs !== m.versionTs) {
      log.info(`Agent [${m.key}] Rec [${recordNumber}]: Deferring`);
      return;
    }

    const recordDate = moment(rec.timeString).utcOffset(0, true).utc();

    if (!(recordDate && recordDate.isValid())) throw new Error('Invalid time format');

    const sourceKey = `${rec.station}$$${rec.table}`;
    const source = m.sources[sourceKey];

    if (!source) throw new Error(`No source found for '${sourceKey}'`);

    publish({ log, m, rec, recordNumber, source, stan }).then(() => {
      log.info(`Agent [${m.key}] Rec [${recordNumber}]: Sending ack`);

      return ldmpClient.ack();
    }).then(() => {
      source.ackTs = new Date();

      if (!m.bookmarks) m.bookmarks = {};
      m.bookmarks[sourceKey] = recordDate.valueOf();

      log.info(`Agent [${m.key}] Rec [${recordNumber}]: Ack sent`);
    }).catch(err => {
      log.error(`Agent [${m.key}] Rec [${recordNumber}]: ${err.message}`);
    });
  } catch (err) {
    log.error(`Agent [${m.key}] Rec [${recordNumber}]: ${err.message}`);
  }
}

module.exports = {
  guard(m) {
    return !m.ldmpClientError && !m.private.ldmpClient;
  },

  execute(m) {
    const cfg = m.$app.get('clients').ldmp;

    return new ldmp.LDMPClient(cfg);
  },

  assign(m, res) {
    const log = m.$app.logger;

    log.info(`Agent [${m.key}]: LDMP client ready`);

    m.private.ldmpClient = res;
    m.private.ldmpClient.on('record', handleRecord.bind(m));
  }
};