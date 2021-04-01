// deps
const prompts = require('prompts');
const glob = require('glob');
const path = require('path');
const chalk = require('chalk');
const joi = require('@hapi/joi');
const exeunt = require('exeunt');
const program = require('commander');

// module deps
const { prettyError, ExtendedError } = require('../extended_error');
const { runExitHandlers } = require('./cleanup.util');

// local deps
const { renameObjectKeys } = require('./object.util');

// constants
const STATUS_MESSAGES = {
  LOADING_MSG: chalk.bgYellow('[LOADING]'),
  DONE_MSG: chalk.bgGreen('[DONE]'),
  STARTING_MSG: chalk.bgYellow('[STARTING]'),
  PROGRESS_MSG: chalk.bgYellow('[PROGRESS]'),
  COMPLETE_MSG: chalk.bgGreen('[COMPLETE]'),
  WARNING_MSG: chalk.bgKeyword('orange')('[WARNING]'),
  ERROR_MSG: chalk.bgRed('[ERROR]'),
  DRY_RUN_MSG: chalk.bgGreen('[DRY RUN]'),
  WET_RUN_MSG: chalk.bgYellow('[WET RUN]'),
};
const SIGINT = 'SIGINT';
const PROCESS_SIGNALS = [
  SIGINT,
  'SIGHUP',
  'SIGQUIT',
  'SIGILL',
  'SIGTRAP',
  'SIGABRT',
  'SIGBUS',
  'SIGFPE',
  'SIGUSR1',
  'SIGSEGV',
  'SIGUSR2',
  'SIGTERM',
];

/**
 * Parse boolean from a string. Throws an error
 * if user enters something that is not an acceptable
 * boolean.
 *
 * @param  {String}   _s  Input string
 * @return {Boolean}      true if user entered 't' or 'true', false otherwise
 */
function parseBoolean(_s) {
  if (typeof _s === 'boolean') return _s;
  const s = _s.toString().toLowerCase();
  const acceptable = ['t', 'true', 'f', 'false'];
  if (!acceptable.includes(s))
    throw new Error(
      `Invalid option ${_s}. Acceptable values for boolean option are: ${acceptable}`,
    );
  return s === 't' || s === 'true';
}

/**
 * Parse a number from a string. Throws an error
 * if parseFloat or parseInt failed.
 *
 * @param _s
 * @return {number}
 */
function parseNumber(_s) {
  if (typeof _s === 'number' && !isNaN(_s)) return _s;
  try {
    const fl = parseFloat(_s);
    if (Number.isSafeInteger(fl)) return parseInt(_s);
    return fl;
  } catch (err) {
    throw new Error(err);
  }
}

/**
 * Parse an integer from a string. Throws an error
 * if parseInt failed.
 *
 * @param _s
 * @return {number}
 */
function parseProgramInt(_s) {
  if (typeof _s === 'number' && !isNaN(_s)) return _s;
  try {
    return parseInt(_s);
  } catch (err) {
    throw new Error(err);
  }
}

/**
 * Parse a 'yes' or 'no' answer from a string. Throws
 * an error if user enters something that is not an
 * acceptable 'yes' or 'no'. Returns true if user
 * answered 'yes' and false otherwise.
 *
 * @param  {String}   _s  Input string
 * @return {Boolean}      true if user entered 'y' or 'yes', false otherwise
 */
function parseYesOrNo(_s) {
  const s = _s.toString().toLowerCase();
  const acceptable = ['y', 'yes', 'n', 'no'];
  if (!acceptable.includes(s))
    throw new Error(`Invalid option ${_s}. Please enter one of: ${acceptable}`);
  return s === 'y' || s === 'yes';
}

/**
 * Prompt user to confirm something.
 * @param message                            Message for user
 * @return {Promise<boolean|*>}            Resolves to true if user
 *                                            confirmed, false if user
 *                                            responded no, and null
 *                                            if user cancelled.
 */
async function getConfirmation(message = 'Confirm?') {
  let ex = false;
  const input = await prompts(
    [
      {
        type: 'confirm',
        name: 'value',
        message,
        initial: true,
      },
    ],
    {
      onCancel: () => {
        ex = true;
        return false;
      },
    },
  );
  if (ex) return null;
  return input.value;
}

/**
 * Validation schema for selectInfiles function config
 *
 * @type {this | * | {value, errors}}
 */
const selectInfilesConfigSchema = joi
  .object({
    inDirectory: joi.string().required(),
    filePattern: joi.string().required(),
  })
  .unknown()
  .required();

/**
 * @typedef {Object} SelectInfilesConfig
 * @property {string} inDirectory directory to check for files
 * @property {string} filePattern glob file pattern
 *
 * @example
 * {
 *     inDirectory: 'Users/someUsers/directory',
 *     filePattern: 'some*file.json'
 * }
 */

/**
 * @description
 * Prompt user to select one or more input files. Config param has required
 * fields, see below. If only a single file is found in the directory, it
 * is returned.
 *
 * @param {SelectInfilesConfig} config
 * @param {String} message Message to prompt user
 * @param {boolean} multi Select multiple files or a single file
 * @param {boolean} autoSelect if only a single file is found, return it immediately without prompting the user
 * @return {Promise<Array<string>>} Resolves with an array of selected files in multi mode,
 * otherwise resolves with a single filename. Resolves with null if user cancelled the prompt.
 * Rejects if no files were found
 */
async function selectInfiles(
  config,
  message = 'Select files to load',
  multi = true,
  autoSelect = true,
) {
  const { error } = selectInfilesConfigSchema.validate(config);
  if (error) throw new Error(error);
  const { inDirectory, filePattern } = config;
  const inFilePattern = `${inDirectory}/${filePattern}`;
  const resultFiles = glob.sync(inFilePattern).sort();

  if (resultFiles.length === 0) throw new Error('FILES NOT FOUND');
  else if (autoSelect && resultFiles.length === 1) {
    if (multi) return resultFiles;
    else return resultFiles[0];
  }
  let ex = false;
  const { files } = await prompts(
    [
      {
        type: multi ? 'multiselect' : 'select',
        name: 'files',
        message,
        choices: resultFiles.map(f => ({
          title: path.basename(f),
          value: f,
          selected: true,
        })),
      },
    ],
    {
      onCancel: async () => {
        ex = true;
        return false;
      },
    },
  );
  if (ex) return null;
  return files;
}

/**
 * Wait for async cleanup to happen and force node to stay awake
 */
class AsyncExitHandler {
  constructor(delay = 1000) {
    this.done = false;
    this.delay = delay;
  }

  waitForExit() {
    if (!this.done) setTimeout(() => this.waitForExit.call(this), this.delay);
  }

  signalExit() {
    this.done = true;
  }
}

/**
 * Default exit handler. This will call await runExitHandlers()
 * (see cleanup.model.js) and then call process.exit as a SetImmediate.
 *
 * IMPORTANT: Calling this function WILL NOT immediately exit node! Any
 * additional pending events in the event queue will be run first (such as
 * intervals, timeouts, and async functions). This is not a replacement
 * for proper returns from async actions, this only signals the program to
 * exit once any pending promises have been resolved. The callee should always
 * return from any async functions after this has been called.
 *
 * @param code 						Exit code
 * @return {Promise<void>} 			Resolves when exit handlers have
 * 									been run, and setImmediate --> process.exit
 * 									has been called
 */
async function exit(code) {
  if (!code) code = 0;
  try {
    await runExitHandlers();
  } catch (err) {
    console.error(prettyError.render(err));
    console.error(chalk.red('Error running exit handlers...'));
    if (code === 0) code = 1;
  }
  if (code !== 0) console.error(chalk.red('Exiting with errors...'));
  else console.log(chalk.yellow('Exiting...'));
  exeunt(code);
  return code;
}

/**
 * @typedef {Object} SetupProgramDefaults
 * @property {boolean} [verbose] (default false) Set "verbose" mode (-v, --verbose)
 * @property {boolean} [dry] (default true) Run the script in "dry" mode (-Z, --dry)
 * @property {string} [inDir] (default null) Set the input directory. Relative paths ok (-I, --in-dir)
 * @property {string} [inFile] (default null) Set the input file. Relative paths ok (-i, --in-file)
 * @property {string} [outDir] (default null) Set the output directory. Relative paths ok (-O, --out-dir)
 * @property {string} [outFile] (default null) Set the output file. Relative paths ok (-o, --out-file)
 * @property {number} [limit] (default null) Limit the results to specified number (-l, --limit)
 * @property {number} [offset] (default null) Offset the results by specified number (--offset)
 * @property {boolean} [debug] (default null) Set "debug" mode (--debug)
 */

/**
 * @typedef {Array} SetupProgramOptions
 * @description
 * Array of arg arrays to pass to the program.option(...) function
 * @example
 * [
 * 	['-i, --input', 'Set input file', null],
 * ]
 *
 * Called as: program.option('-i, --input', 'Set input file', null)
 */

/**
 * @typedef {Array} SetupProgramCommandsArr
 * @description
 * Array of command options to pass directly to program.
 * @example
 * program.command('<cmd> [env]') --> Do:
 * [
 * 	['command', '<cmd> [env]']
 * ]
 *
 * program.description('run setup commands for all envs') --> Do:
 * [
 * 	['description', 'run setup commands for all envs']
 * ]
 */

/**
 * @typedef {Array} SetupProgramRenameKeysArr
 * @description
 * Rename keys in the outputted config object
 * @example
 * setupProgram(..., ..., [['keyA', 'renamedKeyA']])
 *
 * returns {
 *     ... other configs ...,
 *     renamedKeyA: <value from keyA>
 * }
 */

/**
 * @param {SetupProgramOptions} options Array of arg arrays to pass down to program.option
 * @param {SetupProgramCommandsArr} commandsArr Array of command options to pass directly to program
 * @param {SetupProgramRenameKeysArr} renameKeysArr Rename program fields in output
 * @return {Object|SetupProgramDefaults}
 *
 * @description
 * Read command line arguments for the currently running script with some
 * defaults, and optionally add any additional options. If
 * renameKeysArr is specified, rename the keys on the resulting config
 * object to the specifications of renameKeysArr. See object.util.js
 * (renameObjectKeys) for implementation details. This will return
 * a config object (commander instance) containing the parsed options
 * from process.argv
 *
 * @see renameObjectKeys
 *
 * Options should be an array containing "options args", that get passed
 * directly to commander's "option" method.
 * For more details see: {@link https://www.npmjs.com/package/commander}
 *
 * If any option flags match the defaults, the default will be overwritten
 * with that option. See defaults: {@link SetupProgramDefaults}.
 * @see SetupProgramDefaults
 *
 * Each optionsArgs array can contain a 4th element, a parser function to
 * parse the string passed to the program. Any errors thrown during parsing
 * will be thrown by this method.
 *
 * This module contains some parsers that can be used as helpers here: {@link parseBoolean},
 * {@link parseYesOrNo}, {@link parseNumber}, {@link parseProgramInt}
 * @see parseBoolean
 * @see parseYesOrNo
 * @see parseNumber
 * @see parseProgramInt
 *
 * @example
 * Default Option Override
 * Passing ['-i, --anOption', 'Some option here', null]
 * overwrites ['-i, --in-file', ...]
 *
 * @example
 * Add a parser
 * Passing ['--someArg <integer>', 'Enter some integer input', -1, parseInt]
 * 		- Flag name is "someArg", usage "node script.js --someArg=5"
 * 		- Description is "Enter some integer input"
 * 		- Default value is -1
 * 		- Attempt to parse "5" using "parseInt" function.
 * 		  Throw any errors encountered while parsing.
 *
 * @example
 * Command Line Usage Example
 * setupProgram(
 * 	[['--optionA <string>', 'Set the option A', null]],
 * 	[
 * 	  ['command', '<cmd> [env]'],
 * 	  ['description', 'run setup commands for all envs'],
 * 	  ['action', (env, options) => {...}]],
 * 	[['optionA', 'renamedOptionA'], ['dry', 'dryRun']]
 * )
 * node script.js someCommand --dry=false -v --optionA='valueA'
 * Returns: {
 *     dryRun: false,
 *     verbose: false,
 *     indir: null,
 *     infile: null,
 *     outdir: null,
 *     outfile: null,
 *     limit: null,
 *     debug: false,
 *     renamedOptionA: 'valueA',
 * }
 */
function setupProgram(options = [], commandsArr = [], renameKeysArr = []) {
  if (!options || !Array.isArray(options)) options = [];
  else if (options.length > 0 && !Array.isArray(options[0]))
    options = [options]; // single option only, wrap in array
  if (!commandsArr || !Array.isArray(commandsArr)) commandsArr = [];
  const appendDefault = defaultArgs => {
    let [shortFlag, longFlag = null] = defaultArgs[0].split(', ');
    if (longFlag) {
      longFlag = longFlag.split(/\s/)[0].trim();
    }
    const dupe = options.find(o => {
      let [short, long = null] = o[0].split(', ');
      if (short.trim().match(shortFlag.trim())) return true;
      if (long) {
        long = long.split(/\s/)[0].trim();
        if (long.match(longFlag)) return true;
      }
      return false;
    });
    if (!dupe) options.push(defaultArgs);
  };
  const defaults = [
    ['-v, --verbose', 'Set log level to debug', false, parseBoolean],
    ['-Z, --dry <boolean>', 'Dry run flag', true, parseBoolean],
    ['-I, --in-dir <string>', 'Set the input directory', null],
    ['-i, --in-file <string>', 'Set the input file', null],
    ['-O, --out-dir <string>', 'Set the output directory', null],
    ['-o, --out-file <string>', 'Set the output file', null],
    ['-l, --limit <number>', 'Limit results / ops', parseProgramInt],
    ['--offset <number>', 'Offset results', parseProgramInt],
    ['--debug', 'Run in debug mode', false],
  ];
  defaults.forEach(d => appendDefault(d));
  options.forEach(optionArgs => program.option(...optionArgs.slice(0, 3)));
  commandsArr.forEach(commandConfig =>
    program[commandConfig[0]](...commandConfig.slice(1)),
  );
  program.parse(process.argv);

  try {
    const parsers = options
      .filter(o => o.length > 3)
      .map(o => {
        const [shortFlag, longFlag = null] = o[0]
          .split(',')
          .map(t => t.trim())
          .filter(t => t);
        let name = shortFlag;
        if (longFlag) {
          const match = longFlag.match(/--([a-zA-Z]+)/);
          name = match[1];
        } else {
          const match = shortFlag.match(/--([a-zA-Z]+)/);
          if (match) name = match[1];
        }
        return {
          name,
          parser: o[3],
        };
      });
    for (const { name, parser } of parsers) {
      program[name] =
        typeof program[name] !== 'undefined' ? parser(program[name]) : null;
    }
  } catch (err) {
    console.error(prettyError.render(err));
    throw new ExtendedError('Error parsing process.argv');
  }

  if (Array.isArray(renameKeysArr) && renameKeysArr.length > 0) {
    renameObjectKeys(program, renameKeysArr);
  }

  if (program.inDir) {
    program.inDir = path.resolve(program.inDir);
  }
  if (program.outDir) {
    program.outDir = path.resolve(program.outDir);
  }
  if (program.inFile) {
    program.inFile = path.resolve(program.inFile);
  }
  if (program.outFile) {
    program.outFile = path.resolve(program.outFile);
  }

  return program;
}

function registerSignalListeners() {
  PROCESS_SIGNALS.forEach(sig => {
    process.once(sig, () => {
      return exit(sig === SIGINT ? 0 : 1);
    });
  });
}

module.exports = {
  parseBoolean,
  parseYesOrNo,
  getConfirmation,
  selectInfiles,
  STATUS_MESSAGES,
  exit,
  parseNumber,
  AsyncExitHandler,
  setupProgram,
  registerSignalListeners,
};
