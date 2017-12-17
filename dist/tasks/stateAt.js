"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  clear(m) {
    m.stateAt = m.state.created_at;
  },
  guard(m) {
    return false;
  },
  execute() {}
};