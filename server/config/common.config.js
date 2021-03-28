// DEPENDENCIES
const joi = require('@hapi/joi');
const path = require('path');
const appRoot = require('app-root-path');
const fs = require('fs');
const os = require('os');

const envVarsSchema = joi
  .object({
    NODE_ENV: joi
      .string()
      .allow(...['development', 'production', 'test', 'provision'])
      .required(),
  })
  .unknown()
  .required();

const { error, value: envVars } = envVarsSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const PLATFORM_NAMES = {
  windows: 'windows',
  macos: 'macos',
  linux: 'linux',
  android: 'android',
  ios: 'ios',
};

const BROWSER_NAMES = {
  chrome: 'chrome',
  safari: 'safari',
  internetExplorer: 'internet explorer',
  opera: 'opera',
  firefox: 'firefox',
  android: 'android',
};

const platform = (() => {
  if (process.platform === 'win32') return 'windows';
  else if (process.platform === 'darwin') return 'macos';
  else if (process.platform === 'linux') return 'linux';
  else {
    PLATFORM_NAMES[process.platform] = process.platform;
    return process.platform;
  }
})();

const version = (() => {
  try {
    return JSON.parse(fs.readFileSync(`${appRoot}/package.json`).toString())
      .version;
  } catch (err) {
    console.error(err);
    console.error('Error reading version from package.json');
    return null;
  }
})();

const hostname = os.hostname();

/**
 *
 * @typedef {{gigwellApiLoggingBaseUrl: string, instanceName: string, PLATFORM_NAMES: {linux: string, android: string, windows: string, ios: string, macos: string}, rootDir: *, pid: Number, userAgent: string, apiClientLoggingProductName: string, env: string, BROWSER_NAMES: {opera: string, chrome: string, safari: string, firefox: string, android: string, internetExplorer: string}, version: (null|undefined), platform: (string|Object.platform|process.platform), hostname: *, gigwellApiBaseurl: string, logDir: *}} ServerCommonConfig
 */
const serverConfig = {
  env: envVars.NODE_ENV,
  rootDir: path.resolve(__dirname, '../..'),
  platform,
  pid: process.pid,
  PLATFORM_NAMES,
  BROWSER_NAMES,
  version,
  hostname,
};

// don't expose important secrets to the client!
/**
 *
 * @typedef {{gigwellApiLoggingBaseUrl: string, instanceName: string, gigwellApiBaseurl: string, PLATFORM_NAMES: {linux: string, android: string, windows: string, ios: string, macos: string}, apiClientLoggingProductName: string, env: string, BROWSER_NAMES: {opera: string, chrome: string, safari: string, firefox: string, android: string, internetExplorer: string}, version: (null|undefined)}} ClientCommonConfig
 */
const clientConfig = {
  env: envVars.NODE_ENV,
  PLATFORM_NAMES,
  BROWSER_NAMES,
  instanceName: envVars.INSTANCE_NAME,
  version,
};

const result =
  process.env.PROCESS_TYPE === 'web-client' ? clientConfig : serverConfig;
/**
 *
 * @typedef {{gigwellApiLoggingBaseUrl: string, instanceName: string, gigwellApiBaseurl: string, PLATFORM_NAMES: {linux: string, android: string, windows: string, ios: string, macos: string}, apiClientLoggingProductName: string, env: string, BROWSER_NAMES: {opera: string, chrome: string, safari: string, firefox: string, android: string, internetExplorer: string}, version: (null|undefined)} & {gigwellApiLoggingBaseUrl, instanceName, PLATFORM_NAMES, rootDir: (*|string), pid, userAgent, apiClientLoggingProductName, env: string, BROWSER_NAMES, version, platform, hostname, gigwellApiBaseurl, logDir} & {getSchema: (function(): this | *)}} CommonConfig
 */
module.exports = Object.assign(result, {
  getSchema: () => envVarsSchema,
});
