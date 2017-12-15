"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  guard(m) {
    return !m.specifyError && m.client && m.client.isConnected && m.connectStateAt === m.state.updated_at && m.specsStateAt === m.state.updated_at && m.specifyStateAt !== m.state.updated_at;
  },
  execute(m) {
    return m.client.specify(m.specs);
  },
  assign(m) {
    m.specifyStateAt = m.state.updated_at;
  }
};