"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  guard(m) {
    return !m.specifyError && m.private.client && m.private.client.isConnected && m.connectStateAt === m.stateAt && m.specifyStateAt !== m.stateAt;
  },
  execute(m) {
    return m.private.client.specify(m.specs);
  },
  assign(m) {
    m.specifyStateAt = m.stateAt;
  }
};