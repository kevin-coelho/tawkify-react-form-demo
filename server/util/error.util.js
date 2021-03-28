const { isObject } = require('./object.util');

const ERROR_TYPES = {
  MONGO_UNIQUE_CONSTRAINT: 'MONGO_UNIQUE_CONSTRAINT',
};

function isElasticResponseError(err) {
  return err.meta && err.meta.body && err.meta.body.error;
}

function extractElasticResponseError(err) {
  if (!isElasticResponseError(err)) return null;
  const error = new Error();
  const innerError = err.meta.body.error;
  const { root_cause, type, reason, status } = innerError;
  Object.assign(error, {
    type,
    reason,
    status,
    root_cause,
  });
  error.message = `${err.message}\n\tfrom ${reason}`;
  error.stack = `${err.stack}\nCaused by: ${reason}`;
  error.code = err.meta.body.status || err.code;
  error.name = err.name;
  error.errno = err.errno;
  attachJSONStringify(error);
  Object.assign(error, {
    meta: err.meta,
  });
  return error;
}

function getErrorType(err) {
  if (err.message.includes('E11000')) return ERROR_TYPES.MONGO_UNIQUE_CONSTRAINT;
}

function isCelebrateResponseError(err) {
  return err.response && err.response.data && err.response.data.validation;
}

function extractCelebrateResponseError(err) {
  if (!isCelebrateResponseError(err)) return null;
  const error = new Error();
  const msg = err.response.data.msg || err.response.data.message;
  if (msg) {
    error.message = `${err.message}\n\tfrom ${msg}`;
    error.stack = `${err.stack}\nCaused by: ${msg}`;
  } else {
    console.warn('extractCelebrateResponseError: err.response.data is missing "msg" and "message" fields');
  }
  if (err.response.data.validation) {
    error.stack += `\nValidation error details: ${JSON.stringify(err.response.data.validation)}`;
  } else {
    console.warn('extractCelebrateResponseError: err.response.data is missing "validation" field');
  }
  error.code = err.response.data.statusCode || err.response.status || err.code || error.code;
  error.name = err.name;
  error.errno = err.errno;
  attachJSONStringify(error);
  return error;
}

function wrapErrResponse(err) {
  if (isCelebrateResponseError(err)) return extractCelebrateResponseError(err);
  const error = new Error();
  // convenience for parsing out response error msg from back end
  if (err.response && err.response.data && (err.response.data.msg || err.response.data.message)) {
    const msg = err.response.data.msg || err.response.data.message;
    error.message = `${err.message}\n\tfrom: ${msg}`;
    error.stack = `${err.stack}\nCaused by: ${msg}`;
    error.code = err.response.data.statusCode || err.response.status || err.code || error.code;
    error.statusText = err.response.data.statusText || err.response.statusText;
  } else if (err.response && err.response.data && (err.response.data.error || err.response.data.err)) {
    const responseErr = err.response.data.error || err.response.data.err;
    const msg = responseErr.message;
    error.message = `${err.message}\nfrom: ${msg}`;
    if (responseErr.stack) error.stack = `${err.stack}\nCaused by: ${responseErr.stack}`;
    error.code = responseErr.code || error.code;
    if (responseErr.status) error.status = responseErr.status;
  } else {
    error.name = err.name;
    error.message = err.message;
    error.errno = err.errno;
    error.stack = err.stack;
    error.code = err.code;
  }
  //console.debug('wrapped err', {
  //    error
  //  });
  attachJSONStringify(error);
  return error;
}
/**
 * Attach the toJSON method to an error object to make it json stringifiable
 * @param err
 */
function attachJSONStringify(err) {
  if (!Object.prototype.hasOwnProperty.call(err, 'toJSON')) {
    Object.defineProperty(err, 'toJSON', {
      value: function() {
        const alt = {};

        Object.getOwnPropertyNames(this).forEach(function(key) {
          alt[key] = this[key];
        }, this);

        return alt;
      },
      configurable: true,
      writable: true,
    });
  }
}

function getFullErrorStack(ex) {
  var ret = ex.stack || ex.toString();
  if (ex.cause && typeof ex.cause === 'function') {
    var cex = ex.cause();
    if (cex) {
      ret += '\nCaused by: ' + getFullErrorStack(cex);
    }
  } else if (ex.isJoi) {
    //console.debug(require('util').inspect(ex, false, null, true));
    if (ex.details) {
      ex.details.forEach((detail, idx) => {
        let causedMsg = idx === 0 ? '\nCaused by: ' : '\nMultiple errors: ';
        causedMsg += detail.message;
        if (detail.context && detail.context.value)
          causedMsg += `\nReceived value: ${detail.context.value}`;
        if (detail.path)
          causedMsg += `\nAt path: \n\t.${detail.path.join('\n\t.')}`;
        ret += causedMsg;
      });
    }
  }
  return ret;
}

function handleHasuraError(hasuraResponse) {
  if (hasuraResponse.errors && hasuraResponse.errors.length) {
    console.error(hasuraResponse.errors);
    const e = new Error('Hasura error');
    e.errors = hasuraResponse.errors;
    e.isHasuraError = true;
    attachJSONStringify(e);
    throw e;
  }
}

/**
 *
 * @param {string} user_id
 * @param {string} schema_name tags_spotify_user or tags_user
 * @param {{data:{tags_spotify_user:Array<Object>|Object}|{tags_user:Array<Object>|Object}}} hasuraRes
 * @param {string} fieldCheck if returned data is an object, check this field in the object
 */
function handleUserNotFoundError(user_id, schema_name, hasuraRes, fieldCheck = 'id') {
  let found = true;
  if (!hasuraRes.data || !hasuraRes.data[schema_name]) {
    found = false;
  } else if (isObject(hasuraRes.data[schema_name]) && !hasuraRes.data[schema_name][fieldCheck]) {
    found = false;
  } else if (Array.isArray(hasuraRes.data[schema_name]) && !hasuraRes.data[schema_name].length) {
    found = false;
  }
  if (!found) {
    const e = new Error(`User with id ${user_id} not found`);
    e.status = 404;
    e.data = {
      user_id
    };
    attachJSONStringify(e);
    throw e;
  }
}

function extractJoiError(err) {
  if (!err.isJoi) return null;
  const error = new Error();
  error.stack = getFullErrorStack(err);
  error.code = err.code;
  error.name = err.name;
  error.errno = err.errno;
  error.syscall = err.syscall;
  error.toJSON = () => ({
    stack: error.stack,
    message: error.message,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode,
  });
  error.message = err.message;
  return error;
}

module.exports = {
  wrapErrResponse,
  getFullErrorStack,
  extractJoiError,
  attachJSONStringify,
  ERROR_TYPES,
  getErrorType,
  handleHasuraError,
  extractElasticResponseError,
  isElasticResponseError,
  handleUserNotFoundError,
  extractCelebrateResponseError,
};
