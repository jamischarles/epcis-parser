// This is a CommonJS bridge to the ESM module
const { createParser } = require('./dist/index.js');

module.exports = {
  createParser
};