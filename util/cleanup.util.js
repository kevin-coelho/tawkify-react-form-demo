// DEPENDENCIES
const Promise = require('bluebird');

// GLOBAL VARS
const EXIT_HANDLERS = [];

function pushExitHandler(fn, debug = false) {
  if (debug)
    console.debug('Pushing exit handler ', (fn.name || 'anonymous') + '()');
  EXIT_HANDLERS.unshift(fn);
}

function removeExitHandler(fn, debug = null) {
  if (debug)
    console.debug('Removing exit handler ', (fn.name || 'anonymous') + '()');
  const index = EXIT_HANDLERS.indexOf(fn);
  if (index !== -1) EXIT_HANDLERS.splice(index, 1);
}

async function runExitHandlers() {
  await Promise.each(EXIT_HANDLERS, fn => {
    try {
      return fn();
    } catch (err) {
      console.error(err);
      console.error(
        'Error occurred while cleaning up, exitHandler: ',
        (fn.name || 'anonymous') + '()',
      );
    }
  });
}

module.exports = {
  pushExitHandler,
  removeExitHandler,
  runExitHandlers,
};
