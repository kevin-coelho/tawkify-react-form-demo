// DEPENDENCIES
const joi = require('@hapi/joi');
const contentType = require('content-type');
const fileType = require('file-type');
const { isReadableStream, assignNonNullKeys } = require('./object.util');
const { attachJSONStringify } = require('./error.util');

// CONSTANTS
const REQUEST_HEADERS = {
  CONTENT_TYPES: {
    IMAGE: {
      JPEG: 'image/jpeg',
      GIF: 'image/gif',
      PNG: 'image/png',
      SVG: 'image/svg+xml',
      TIFF: 'image/tiff',
      JPG: 'image/jpg',
      WEBP: 'image/webp',
    },
    FILE: {
      TXT: 'text/plain; charset=UTF-8',
      CSV: 'text/csv; charset=UTF-8',
      JSON: 'application/json',
      BINARY: 'application/octet-stream',
      PDF: 'application/pdf',
      ZIP: 'application/zip',
      HTML: 'text/html',
      GZIP: 'application/gzip',
    },
  },
};

/**
 * @typedef {{IMAGE: {JPG: string, TIFF: string, WEBP: string, GIF: string, SVG: string, PNG: string, JPEG: string}, FILE: {ZIP: string, TXT: string, PDF: string, CSV: string, BINARY: string, JSON: string, HTML: string, GZIP: string}}|{IMAGE: {JPG: string, TIFF: string, WEBP: string, GIF: string, SVG: string, PNG: string, JPEG: string}, FILE: {ZIP: string, TXT: string, PDF: string, CSV: string, BINARY: string, JSON: string, HTML: string, GZIP: string}}} CONTENT_TYPES
 */
const CONTENT_TYPES = REQUEST_HEADERS.CONTENT_TYPES;
const VALID_CONTENT_TYPES = Object.values(CONTENT_TYPES.IMAGE).concat(
  Object.values(CONTENT_TYPES.FILE),
);
const VALID_IMAGE_CONTENT_TYPES = Object.values(CONTENT_TYPES.IMAGE);
const IMAGE_MIME_SCHEMA = joi.string().allow(...VALID_IMAGE_CONTENT_TYPES);
const CONTENT_TYPE_SCHEMA = joi.string().allow(...VALID_CONTENT_TYPES);

/**
 * Parse { ext, mime } from an uploaded file via multipart
 * @param file
 * @return {Promise<FileTypeResult | undefined>}
 */
async function parseMultipartFileContentType(file) {
  if (Buffer.isBuffer(file)) {
    return fileType.fromBuffer(file);
  } else if (isReadableStream(file)) {
    return fileType.fromStream(file);
  } else {
    return fileType.fromFile(file);
  }
}

/**
 * @example
 * parseRequestContentType(req) ===
 * {
 *  type: 'image/svg+xml',
 *  parameters: {
 *    charset: 'utf-8'
 *  }
 * }
 * @param {{headers:{'content-type':string}}} req Express request or response object, or object with .headers
 * @return {Promise<ContentTypeResult>}
 */
async function parseRequestContentType(req) {
  return contentType.parse(req);
}

/**
 * @description
 * Helper fn to correctly / consistently format error responses.
 * If <error> is passed, a .toJSON() method will automatically be
 * attached to it allowing it to be properly stringified for the client.
 * if <meta> is passed, its top level keys will be assigned to the response data
 * sent to the client.
 * @param res Express response object
 * @param {number} status Status code
 * @param {string|null} [msg] Error message to send
 * @param {Error} [err] Error object to send
 * @param {Object} [meta] Any additional data to send to the client
 * @example
 * sendErrorResponse(res, 404, 'Object not found', new Error('No object'), { objectId: 'some id' })
 *  --> (client) {
 *    status: 404,
 *    data: {
 *      err: {
 *        message: 'No Object',
 *        stack: '...',
 *      },
 *      msg: 'Object not found',
 *      objectId: 'some id',
 *    }
 *  }
 */
function sendErrorResponse(res, status, msg = null, err = null, meta = {}) {
  if (!res || !status) throw new Error('sendErrorResponse: <res> and <status> params are required');
  if (err) {
    attachJSONStringify(err);
  }
  res.status(status).json(assignNonNullKeys(meta, {
    msg,
    err,
  }));
}

module.exports = {
  REQUEST_HEADERS,
  CONTENT_TYPE_SCHEMA,
  VALID_CONTENT_TYPES,
  CONTENT_TYPES,
  IMAGE_MIME_SCHEMA,
  parseMultipartFileContentType,
  parseRequestContentType,
  sendErrorResponse,
};
