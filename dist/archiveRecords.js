'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
const ldmp = require('@dendra-science/csi-ldmp-client');
const moment = require('moment');
const { MomentEditor } = require('@dendra-science/utils-moment');

function handleRecord(rec) {
  if (!rec) return;

  const m = this.model;
  const recNbr = rec.recordNumber;

  try {
    //
    // Begin standard record validation
    // TODO: Move to helper
    if (typeof recNbr === 'undefined') throw new Error('Record number undefined');

    if (m.specifyStateAt !== m.stateAt) {
      this.log.info(`Mach [${m.key}] Rec [${recNbr}: Deferring`);
      return;
    }

    const recordDate = moment(rec.timeString).utcOffset(0, true).utc();

    if (!(recordDate && recordDate.isValid())) throw new Error('Invalid time format');

    const sourceKey = `${rec.station} ${rec.table}`;
    const source = m.sources[sourceKey];

    if (!source) throw new Error(`No source found for '${sourceKey}'`);
    // End standard record validation
    //

    const archiveDate = source.timeEditor ? source.timeEditor.edit(recordDate) : recordDate;
    const id = `csi-${rec.station}-${rec.table}-${archiveDate.format('YYYY-MM-DD-HH-mm')}`;

    this.documentService.create({
      _id: id,
      content: rec
    }).then(() => {
      return this.client.ack();
    }).then(() => {
      if (!m.stamps) m.stamps = {};
      m.stamps[sourceKey] = recordDate.valueOf();
    }).catch(err => {
      this.log.error(`Mach [${m.key}] Rec [${recNbr}: ${err.message}`);
    });
  } catch (err) {
    this.log.error(`Mach [${m.key}] Rec [${recNbr}: ${err.message}`);
  }
}

exports.default = {
  client: {
    guard(m) {
      return !m.clientError && !m.private.client;
    },
    execute(m) {
      return new ldmp.LDMPClient(m.$app.get('clients').ldmp);
    },
    assign(m, res) {
      const log = m.$app.logger;

      log.info(`Mach [${m.key}]: Client ready`);

      m.private.client = res;
      m.private.client.on('record', handleRecord.bind({
        client: res,
        documentService: m.$app.get('connections').jsonArchive.app.service('/documents'),
        log: m.$app.logger,
        model: m
      }));
    }
  },

  connect: require('./tasks/connect').default,

  connectReset: require('./tasks/connectReset').default,

  disconnect: require('./tasks/disconnect').default,

  sources: {
    guard(m) {
      return !m.sourcesError && m.state.sources && m.state.sources.length > 0 && m.sourcesStateAt !== m.stateAt;
    },
    execute() {
      return true;
    },
    assign(m) {
      const log = m.$app.logger;

      log.info(`Mach [${m.key}]: Sources ready`);

      m.sources = m.state.sources.reduce((sources, src) => {
        if (src.station && src.table) {
          const sourceKey = `${src.station} ${src.table}`;
          const source = sources[sourceKey] = Object.assign({}, src);

          if (source.transform && source.transform.time_edit) {
            // Create a MomentEditor instance for adjusting timestamps
            source.timeEditor = new MomentEditor(source.transform.time_edit);
          }
        }

        return sources;
      }, {});

      m.sourcesStateAt = m.stateAt;
    }
  },

  specs: {
    guard(m) {
      return !m.specsError && m.sourcesStateAt === m.stateAt && m.specsStateAt !== m.stateAt;
    },
    execute(m) {
      const specs = [];

      for (let sourceKey of Object.keys(m.sources)) {
        const { options, station, table } = m.sources[sourceKey];
        const spec = Object.assign({
          station,
          table
        }, options);

        if (m.state.stamps && m.state.stamps[sourceKey]) {
          const timeStamp = moment(m.state.stamps[sourceKey]).utc();
          spec.time_stamp = timeStamp.format('YYYY MM DD HH:mm:ss.SS');
          spec.start_option = 'at-time';
        } else {
          spec.start_option = 'at-oldest';
        }

        specs.push(spec);
      }

      return specs;
    },
    assign(m, res) {
      const log = m.$app.logger;

      log.info(`Mach [${m.key}]: Specs ready`);

      m.specs = res;
      m.specsStateAt = m.stateAt;
    }
  },

  specify: require('./tasks/specify').default,

  stateAt: require('./tasks/stateAt').default,

  stateStamps: {
    guard(m) {
      return !m.stateStampsReady;
    },
    execute() {
      return true;
    },
    assign(m) {
      m.state.stamps = Object.assign({}, m.stamps);
    }
  }
};