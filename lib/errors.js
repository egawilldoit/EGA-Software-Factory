'use strict';

const { EXIT } = require('./constants');

class FactoryError extends Error {
  constructor(message, code, detail) {
    super(message);
    this.name = 'FactoryError';
    this.code = code || EXIT.IO;
    this.detail = detail || null;
  }
}

function refuse(message, detail) {
  return new FactoryError(message, EXIT.REFUSED, detail);
}

function integrity(message, detail) {
  return new FactoryError(message, EXIT.INTEGRITY, detail);
}

function recovery(message, detail) {
  return new FactoryError(message, EXIT.RECOVERY, detail);
}

function usage(message, detail) {
  return new FactoryError(message, EXIT.USAGE, detail);
}

module.exports = { FactoryError, refuse, integrity, recovery, usage };
