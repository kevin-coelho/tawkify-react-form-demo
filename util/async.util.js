/**
 * Promisified timeout function
 *
 * @param delay 				Delay in ms to wait
 * @return {Promise<any>}
 */
function sleep(delay) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

module.exports = { sleep };
