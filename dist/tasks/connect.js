'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  guard(m) {
    return !m.connectError && m.client && !m.client.isConnected && m.connectStateAt !== m.state.updated_at;
  },
  execute(m) {
    return Promise.race([m.client.connect(),
    // NOTE: Hardcoded 20 second timeout
    new Promise((resolve, reject) => setTimeout(reject, 20000, new Error('Connect timeout')))]).catch(err => {
      if (m.client.socket) m.client.socket.destroy();
      throw err;
    });
  },
  assign(m) {
    m.connectStateAt = m.state.updated_at;
  }
};