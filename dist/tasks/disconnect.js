"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  guard(m) {
    return !m.disconnectError && m.private.client && m.private.client.isConnected && m.connectStateAt !== m.state.updated_at;
  },
  execute(m) {
    return m.private.client.disconnect().then(() => true);
  }
};