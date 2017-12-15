'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const ldmp = require('@dendra-science/csi-ldmp-client');
const moment = require('moment');
const request = require('request');
const { MomentEditor } = require('@dendra-science/utils-moment');

function handleRecord(rec) {
  if (!(rec && rec.recordNumber)) return;

  const m = this.model;
  const updatedAt = m.state.updated_at;

  if (m.specifyStateAt !== updatedAt) {
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

  if (!source) {
    this.log.error(`No source found for '${sourceKey}'`);
    return;
  }

  // Allow for static fields to be specified for every point
  const row = Object.assign({}, source.load.fields, rec.fields && rec.fields.reduce((obj, field) => {
    if (field.name) obj[field.name.replace(/\W+/g, '_')] = field.value;
    return obj;
  }, {}));
  const fieldSet = Object.keys(row).filter(key => {
    return typeof row[key] === 'number' && !Number.isNaN(row[key]);
  }).map(key => {
    return `${key}=${row[key]}`;
  });

  if (fieldSet.length === 0) {
    this.log.error(`Nothing to write for record ${rec.recordNumber}`);
    return;
  }

  const time = source.timeEditor ? source.timeEditor.edit(recordDate).valueOf() : recordDate.valueOf();
  const buf = Buffer.from(`${source.measurementTagSet} ${fieldSet.join(',')} ${time}\n`);

  const requestOpts = {
    body: buf,
    method: 'POST',
    qs: {
      db: source.load.database,
      precision: 'ms'
    },
    url: `${this.influxUrl}/write`
  };

  new Promise((resolve, reject) => {
    request(requestOpts, (err, response) => err ? reject(err) : resolve(response));
  }).then(response => {
    if (response.statusCode !== 204) throw new Error(`Non-success status code ${response.statusCode}`);

    return this.client.ack();
  }).catch(err => {
    this.log.error(err);
  });
}

exports.default = {
  client: {
    guard(m) {
      return !m.clientError && !m.client;
    },
    execute(m) {
      return new ldmp.LDMPClient(m.$app.get('clients').ldmp);
    },
    assign(m, res) {
      m.client = res;
      m.client.on('record', handleRecord.bind({
        client: res,
        influxUrl: m.$app.get('apis').influxDB.url,
        log: m.$app.logger,
        model: m
      }));
    }
  },

  connect: require('./tasks/connect').default,

  database: {
    guard(m) {
      return !m.databaseError && m.sourcesStateAt === m.state.updated_at && m.databaseStateAt !== m.state.updated_at;
    },
    execute(m) {
      const influxUrl = m.$app.get('apis').influxDB.url;
      const databases = [...new Set(Object.keys(m.sources).map(key => m.sources[key].load.database))];
      const requestOpts = {
        method: 'POST',
        qs: {
          q: databases.map(db => `CREATE DATABASE "${db}"`).join(';')
        },
        url: `${influxUrl}/query`
      };

      return new Promise((resolve, reject) => {
        request(requestOpts, (err, response) => err ? reject(err) : resolve(response));
      }).then(response => {
        if (response.statusCode !== 200) throw new Error(`Non-success status code ${response.statusCode}`);

        return true;
      });
    },
    assign(m) {
      m.databaseStateAt = m.state.updated_at;
    }
  },

  disconnect: require('./tasks/disconnect').default,

  sources: {
    guard(m) {
      return !m.sourcesError && m.state.sources && m.state.sources.length > 0 && m.sourcesStateAt !== m.state.updated_at;
    },
    execute() {
      return true;
    },
    assign(m) {
      m.sources = m.state.sources.reduce((sources, src) => {
        if (src.station && src.table && src.load && src.load.database && src.load.measurement) {
          const sourceKey = `${src.station} ${src.table}`;
          const source = sources[sourceKey] = Object.assign({}, src);

          // Concat the leftmost part of the Line Protocol string for loading
          const parts = [source.load.measurement];
          if (source.load.tags) {
            // Allow for static tags to be specified for every point
            Object.keys(source.load.tags).forEach(key => parts.push(`${key}=${source.load.tags[key]}`));
          }
          source.measurementTagSet = parts.join(',');

          if (source.transform && source.transform.time_edit) {
            // Create a MomentEditor instance for adjusting timestamps
            source.timeEditor = new MomentEditor(source.transform.time_edit);
          }

          if (source.transform && source.transform.reverse_time_edit) {
            // Create a MomentEditor instance for adjusting timestamps
            source.reverseTimeEditor = new MomentEditor(source.transform.reverse_time_edit);
          }
        }

        return sources;
      }, {});

      m.sourcesStateAt = m.state.updated_at;
    }
  },

  specs: {
    guard(m) {
      return !m.specsError && m.databaseStateAt === m.state.updated_at && m.specsStateAt !== m.state.updated_at;
    },
    execute(m) {
      return _asyncToGenerator(function* () {
        const influxUrl = m.$app.get('apis').influxDB.url;
        const specs = [];

        for (let sourceKey of Object.keys(m.sources)) {
          const { options, station, table, load, reverseTimeEditor } = m.sources[sourceKey];
          const spec = Object.assign({
            station,
            table
          }, options);

          const requestOpts = {
            method: 'POST',
            qs: {
              db: load.database,
              q: `SELECT * FROM "${load.measurement}" ORDER BY time DESC LIMIT 1`
            },
            url: `${influxUrl}/query`
          };
          const response = yield new Promise(function (resolve, reject) {
            request(requestOpts, function (err, resp) {
              return err ? reject(err) : resolve(resp);
            });
          });

          if (response.statusCode !== 200) throw new Error(`Non-success status code ${response.statusCode}`);

          const body = JSON.parse(response.body);

          try {
            const recordDate = moment(body.results[0].series[0].values[0][0]).utc();
            const timeStamp = reverseTimeEditor ? reverseTimeEditor.edit(recordDate) : recordDate;
            spec.time_stamp = timeStamp.format('YYYY MM DD HH:mm:ss.SS');
            spec.start_option = 'at-time';
          } catch (e) {
            spec.start_option = 'at-oldest';
          }

          specs.push(spec);
        }

        return specs;
      })();
    },
    assign(m, res) {
      m.specs = res;
      m.specsStateAt = m.state.updated_at;
    }
  },

  specify: require('./tasks/specify').default
};