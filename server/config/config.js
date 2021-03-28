// DEPENDENCIES
const path = require('path');
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

// load config
require('dotenv').config({
  path: path.resolve(path.join(__dirname, '..', `.env.${process.env.NODE_ENV}`))
});

// require common config
const common = require('./common.config');
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';
module.exports = common;
