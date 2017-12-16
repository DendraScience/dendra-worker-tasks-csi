'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
const ldmp = require('@dendra-science/csi-ldmp-client');
const moment = require('moment');
const { MomentEditor } = require('@dendra-science/utils-moment');

function handleRecord(rec) {
  if (!(rec && rec.recordNumber)) return;

  const m = this.model;

  if (m.specifyStateAt !== m.state.created_at) {
    this.log.info(`Deferring record ${rec.recordNumber}`);
    return;
  }

  const recordDate = moment(rec.timeString).utcOffset(0, true).utc();

  if (!recordDate) {
    this.log.error(`Invalid time format for record ${rec.recordNumber}`);
    return;
  }

  const sourceKey = `${rec.station} ${rec.table}`;
  const source = m.sources[sourceKey];

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
    this.log.error(err);
  });
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

  disconnect: require('./tasks/disconnect').default,

  sources: {
    guard(m) {
      return !m.sourcesError && m.state.sources && m.state.sources.length > 0 && m.sourcesStateAt !== m.state.created_at;
    },
    execute() {
      return true;
    },
    assign(m) {
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

      m.sourcesStateAt = m.state.created_at;
    }
  },

  specs: {
    guard(m) {
      return !m.specsError && m.sourcesStateAt === m.state.created_at && m.specsStateAt !== m.state.created_at;
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
      m.specs = res;
      m.specsStateAt = m.state.created_at;
    }
  },

  specify: require('./tasks/specify').default,

  stamps: {
    guard(m) {
      return !m.stampsReady;
    },
    execute() {
      return true;
    },
    assign(m) {
      m.state.stamps = Object.assign({}, m.stamps);
    }
  }
};