module.exports = {
  /**
   * Pipe functions together
   *
   * Example:
   * function return1(x) { return 2 * x; }
   * function return2(x) { return [x, 2 * x]; }
   * function accept2(x, y) { return x * y; }
   *
   * pipe(
   *   return1,
   *   return2,
   *   accept2,
   * )(1) === 8
   *
   * @param  {...[list of functions]} fns)    List of functions to apply, in order
   * @return {Object or value}                Final return value of last function
   */
  pipe: (...fns) => (...args) =>
    fns.reduce((v, fn) => (Array.isArray(v) ? fn(...v) : fn(...[v])), args),
};
