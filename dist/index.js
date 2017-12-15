'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _archiveRecords = require('./archiveRecords');

Object.defineProperty(exports, 'archiveRecords', {
  enumerable: true,
  get: function () {
    return _interopRequireDefault(_archiveRecords).default;
  }
});

var _loadRecords = require('./loadRecords');

Object.defineProperty(exports, 'loadRecords', {
  enumerable: true,
  get: function () {
    return _interopRequireDefault(_loadRecords).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }