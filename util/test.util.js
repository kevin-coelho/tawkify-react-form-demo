// deps
const assert = require('assert');
const program = require('commander');
const chalk = require('chalk');
const _ = require('lodash');
const { table } = require('table');
const PrettyError = require('pretty-error');
const pe = new PrettyError();
const Promise = require('bluebird');

// module deps
const { formatObj } = require('./string.util');
const { parseCmdFlags, parseCommandString } = require('./string.util');
const { uniqueByKey, uniqueByKeys } = require('./array.util');
const {
  setupProgram: setupProgramUtilFn,
  parseBoolean,
  exit,
} = require('./program.util');
const {
  includeObjectKeys,
  getObjectDiff,
  isObject,
  isNonNativeClassInstance,
} = require('./object.util');
const { ExtendedError } = require('../../models/extended_error');
const { Time } = require('./time.util');

// setup program
function setupProgram() {
  program.option('-a, --all', 'Run all tests', true);
}

const GLOBAL_SETTINGS = {
  all: false,
  originalArgv: [],
};

/**
 * Setup tests for array util functions
 *
 * @return {*[]}
 */
function setupArrayUtilsTest() {
  const inputs = [
    [
      [
        {
          type: 'typeA',
          url: 'url://A',
        },
        {
          type: 'typeA',
          url: 'url://A',
        },
        {
          type: 'typeB',
          url: 'url://B',
        },
      ],
      ['type', 'url'],
    ],
    [
      [
        {
          id: 'A',
          note: 'stuffA',
        },
        {
          id: 'B',
          note: 'stuffB',
        },
        {
          id: 'A',
          note: 'stuffC',
        },
      ],
      ['id'],
    ],
  ];
  const fns = [uniqueByKeys, uniqueByKey];
  const expectedValues = [
    [
      {
        type: 'typeA',
        url: 'url://A',
      },
      {
        type: 'typeB',
        url: 'url://B',
      },
    ],
    [
      {
        id: 'A',
        note: 'stuffA',
      },
      {
        id: 'B',
        note: 'stuffB',
      },
    ],
  ];
  return [inputs, fns, expectedValues, (a, b) => _.isEqual(a.sort(), b.sort())];
}

/**
 * Setup testing inputs for string matcher functions
 * @return {*[][]}
 */
function setupStringMatchers() {
  const inputs = [
    ['--someoption=some other thing'],
    ['--someoption some other thing'],
    [''],
    ['--someoption'],
    [
      // eslint-disable-next-line quotes
      "cmd --option1=$VAR --option2='another value'",
      { VAR: 'this is an env variable' },
    ],
    ['singlestring'],
    [''],
  ];
  const extractors = [
    parseCmdFlags,
    parseCmdFlags,
    parseCmdFlags,
    parseCmdFlags,
    parseCommandString,
    parseCommandString,
    parseCommandString,
  ];
  const expectedValues = [
    { someoption: 'some other thing' },
    { someoption: 'some other thing' },
    null,
    { someoption: true },
    {
      command: 'cmd',
      option1: 'this is an env variable',
      option2: 'another value',
      args: [],
    },
    { command: 'singlestring', args: [] },
    { command: null },
  ];
  return [inputs, extractors, expectedValues, assert.deepEqual];
}

function setupProgramUtilsTests() {
  const resetArgs = () => {
    process.argv = _.cloneDeep(GLOBAL_SETTINGS.originalArgv);
    process.argv = process.argv.slice(0, 2);
  };
  const inputs = [
    [],
    ['--verbose'],
    ['--dry=false', '-v', '--indir=/some/path', '--limit=5', '--debug'],
    ['--optionA=true'],
  ];
  const fns = [
    // test defaults
    setupProgramUtilFn,
    (...args) => {
      process.argv.push(...args);
      const config = setupProgramUtilFn();
      resetArgs();
      return config;
    },
    // test modifying defaults
    (...args) => {
      process.argv.push(...args);
      const config = setupProgramUtilFn();
      resetArgs();
      return config;
    },
    // test adding another option
    (...args) => {
      process.argv.push(...args);
      const config = setupProgramUtilFn([
        ['--optionA <boolean>', 'Set option a', false, parseBoolean],
      ]);
      resetArgs();
      return config;
    },
  ];
  const expectedValues = [
    {
      dry: true,
      verbose: false,
      indir: null,
      infile: null,
      outdir: null,
      outfile: null,
      limit: undefined,
      debug: false,
    },
    {
      verbose: true,
    },
    {
      dry: false,
      verbose: true,
      indir: '/some/path',
      infile: null,
      outdir: null,
      limit: 5,
      debug: true,
    },
    {
      dry: true,
      verbose: false,
      optionA: true,
    },
  ];
  const compareResults = (result, expected) => {
    return assert.deepEqual(
      includeObjectKeys(result, Object.keys(expected)),
      expected,
    );
  };
  return [inputs, fns, expectedValues, compareResults];
}

/**
 * Run tests
 * @param inputs                    Array of inputs [[...args], [...args], ...]
 * @param fns                        Array of fns [(...args) => {}, ...]
 * @param expectedValues            Array of expected values [v1, v2, ...]
 * @param assertFn                    Assertion function to use e.g. assert.DeepEqual.
 * 										Receives: assertFn(result, expected)
 * @return {boolean}                True if all tests pass, false otherwise
 */
async function testRunner(
  inputs,
  fns,
  expectedValues,
  assertFn = assert.deepEqual,
) {
  let passed = true;
  assert.equal(
    inputs.length,
    fns.length,
    'testRunner received inputs / fns of different length, ensure setup is proper',
  );
  assert.equal(
    inputs.length,
    expectedValues.length,
    'testRunner received inputs / expectedValues of different legnth, ensure setup is proper',
  );
  const results = [];
  const internalErrors = [];
  await Promise.each(inputs, async (args, idx) => {
    const expected = expectedValues[idx];
    const fn = fns[idx];
    let elapsed = null;
    try {
      const startTime = new Time();
      const result = await fn(...args);
      elapsed = startTime.elapsedPretty('ms');
      assertFn(result, expected);
      results.push([
        idx,
        fn.name,
        elapsed,
        chalk.bgGreen('Passed'),
        null,
        null,
        null,
        null,
      ]);
    } catch (err) {
      const failStatus = chalk.bgRed('Failed');
      if (!(err instanceof assert.AssertionError)) {
        results.push([
          idx,
          fn.name,
          elapsed,
          failStatus,
          'Internal error',
          formatObj(expected, false, null, {
            maxArrayLength: null,
          }),
          null,
          null,
        ]);
        internalErrors.push([idx, err]);
      } else {
        const { expected, actual } = err;
        let diff = null;
        if (Array.isArray(expected) && Array.isArray(actual)) {
          const leftDiff = _.difference(expected, actual);
          const rightDiff = _.difference(actual, expected);
          diff = _.uniq(leftDiff.concat(rightDiff));
        } else if (
          isObject(expected) &&
          isObject(actual) &&
          !isNonNativeClassInstance(expected) &&
          !isNonNativeClassInstance(actual)
        ) {
          diff = getObjectDiff(expected, actual);
        }
        results.push([
          idx,
          fn.name,
          elapsed,
          failStatus,
          'Assertion error',
          formatObj(expected, false, null, {
            maxArrayLength: null,
          }),
          formatObj(actual, false, null, {
            maxArrayLength: null,
          }),
          formatObj(diff, false, null, {
            maxArrayLength: null,
          }),
        ]);
      }
      passed = false;
    }
  });

  /*
   * Table: <FN NAME> | <RESULT> | <REASON> | <EXPECTED> | <RECEIVED>
   */
  const headers = [
    ['IDX', 'NAME', 'MS', 'RESULT', 'REASON', 'EXPECTED', 'RECEIVED', 'DIFF'],
  ];
  const data = headers.concat(results);
  console.log(`\n${table(data)}`);
  if (internalErrors.length > 0) {
    const internalErrData = [
      ['IDX', 'ERR STACK', 'EXTENDED'],
      ...internalErrors.map(([idx, err]) => [
        idx,
        pe.render(err),
        err instanceof ExtendedError
          ? formatObj(err.getMeta(), false, null, {
            maxArrayLength: null,
          })
          : null,
      ]),
    ];
    console.log(`\n${table(internalErrData)}`);
  }
  return passed;
}

/**
 * Wrapper for printing out results of a test runner function
 * @param fn                    Test runner function. Expected
 *                                to return true if all tests passed,
 *                                false otherwise
 * @param name                    Name of test runner function (or name
 *                                to print).
 */
async function runTestWrapper(fn, name) {
  try {
    console.log('');
    console.log(`${name.padEnd(35, ' ')}\t\t`, chalk.yellow('Running tests'));
    const startTime = new Time();
    const passed = await fn();
    const elapsed = startTime.elapsedPretty('ms');
    const elapsedMessage = `\tElapsed ${chalk.cyan(elapsed)}`;
    if (passed) {
      console.log(
        `${name.padEnd(35, ' ')}\t\t`,
        chalk.green('All Passed!'.padEnd(35, ' ')),
        elapsedMessage,
      );
    } else {
      console.log(
        `${name.padEnd(35, ' ')}\t\t`,
        chalk.red('One or more tests failed'.padEnd(35, ' ')),
        elapsedMessage,
      );
    }
    console.log('');
  } catch (err) {
    console.error(err);
    console.error('Error running test', chalk.red(name));
  }
}

async function main() {
  setupProgram();
  GLOBAL_SETTINGS.all = program.all;
  GLOBAL_SETTINGS.originalArgv = _.cloneDeep(process.argv);
  // reset process.argv for testing setup program utils
  process.argv = process.argv.slice(0, 2);
  if (GLOBAL_SETTINGS.all)
    await runTestWrapper(
      () => testRunner(...setupStringMatchers()),
      'testStringMatchers',
    );
  if (GLOBAL_SETTINGS.all)
    await runTestWrapper(
      () => testRunner(...setupArrayUtilsTest()),
      'testArrayUtils',
    );
  if (GLOBAL_SETTINGS.all)
    await runTestWrapper(
      () => testRunner(...setupProgramUtilsTests()),
      'testProgramUtils',
    );
  await exit(0);
}

/**
 * Run multiple fn setup objects
 * @param setupFns                    [{ fn, name, }, { fn, name, }, ...]
 */
async function runTests(setupFns) {
  for (const { fn, name } of setupFns)
    await runTestWrapper(() => testRunner(...fn()), name);
  await exit(0);
}

if (require.main === module) {
  main();
} else {
  module.exports = { runTests };
}
