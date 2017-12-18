"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  guard(m) {
    return !m.connectResetReady && m.private.client && !m.private.client.isConnected && m.connectStateAt === m.stateAt;
  },
  execute(m) {
    return true;
  },
  assign(m) {
    const log = m.$app.logger;

    log.info(`Mach [${m.key}]: Connection reset`);

    delete m.connectStateAt;
    delete m.specifyStateAt;
  }
};