// DEPENDENCIES
const AWS = require('aws-sdk');
const { PassThrough, Writable } = require('stream');
/**
 * @type {JoiSchema}
 */
const joi = require('@hapi/joi');
const path = require('path');
const fs = require('fs');
/**
 * @type {ChalkSchema}
 */
const chalk = require('chalk');
const Promise = require('bluebird');

// VALIDATION

/**
 * @typedef {Object} WriteStreamConfig
 * @property {boolean} [objectMode] default=true this stream will break if this is set to false
 * @property {number} [highWaterMark] default=16 default 16 for object mode
 * @property {boolean} [decodeStrings] default=true
 * @property {string} [defaultEncoding] default='utf8'
 * @property {boolean} [emitClose] default=true
 * @property {boolean} [autoDestroy] default=false
 * @description See https://nodejs.org/api/stream.html#stream_constructor_new_stream_writable_options for more information
 */

/**
 * @typedef {Object} ArrayStreamS3Config
 * @property {string} folder directory to write into
 * @property {string} keyPattern some_file_$$
 * @property {string} fileType file extension. currently allows "json" only
 * @property {string} [bucket] s3 bucket name, currently defaults to null
 */

/**
 *
 * @typedef {Object|WriteStreamConfig} ArrayStreamConfig
 * @property {ArrayStreamS3Config} [s3]
 * @property {boolean} [mkdirRecursive] create output directory for the arraystream recursively
 * @property {number} [maxItems] max # of items to write before opening next file
 * @property {joi.object} [itemValidationSchema] default=undefined validate each item before writing
 * @property {boolean} [local] write to file instead of opening stream to s3
 * @property {boolean} [overwrite] default=false overwrite existing file
 * @property {boolean} [lazy] default=true don't open outstream until anything has been written
 * @property {boolean} [append] default=false append to existing file, or increment file name
 * @property {boolean} [verbose] default=false print messages to console
 * @property {boolean} [debug] default=false print debug messages
 *
 */
const bufferedArrayConfigSchema = joi
  .object({
    s3: joi
      .object()
      .keys({
        folder: joi
          .string()
          .lowercase()
          .regex(/[a-zA-Z_-]+/)
          .required(),
        keyPattern: joi
          .string()
          .lowercase()
          .regex(/[a-zA-Z_-]+\$\$/)
          .required(),
        fileType: joi
          .string()
          .lowercase()
          .allow(...['json'])
          .required(),
        bucket: joi
          .string()
          .optional()
          .default(null),
      })
      .required(),
    mkdirRecursive: joi
      .boolean()
      .optional()
      .default(false),
    maxItems: joi
      .number()
      .integer()
      .min(1)
      .required(),
    itemValidationSchema: joi.object().optional(),
    local: joi.boolean().required(),
    overwrite: joi
      .boolean()
      .optional()
      .default(false), // overwrite file if exists
    lazy: joi
      .boolean()
      .optional()
      .default(true), // don't open an outstream until we have to write
    append: joi
      .boolean()
      .optional()
      .default(false), // append to existing file, otherwise increment file name
    verbose: joi
      .boolean()
      .optional()
      .default(false), // print messages
    debug: joi
      .boolean()
      .optional()
      .default(false), // print debug messages
  })
  .unknown()
  .required();

// CONSTANTS
const SEPARATOR = ',';

class ArrayStream extends Writable {
  /**
   * @param {ArrayStreamConfig} args
   * @throws {Error}
   */
  constructor(args) {
    super(Object.assign(args, { objectMode: true }));
    // validate config
    const { error, value } = bufferedArrayConfigSchema.validate(args);
    if (error) throw error;
    this.config = value;
    if (this.config.append && this.config.overwrite)
      throw new Error(
        'ArrayStream: config.append and config.overwrite cannot both be true',
      );
    // trim excessive file types at the end of keyPattern
    if (this.config.s3.keyPattern.endsWith('.' + this.config.s3.fileType)) {
      this.config.s3.keyPattern = this.config.s3.keyPattern.replace(
        new RegExp(`.${this.config.s3.fileType}$`),
        '',
      );
    }

    // try to create validation object from validation schema
    if (this.config.itemValidationSchema) {
      try {
        this.itemValidationSchema = joi.object(
          this.config.itemValidationSchema,
        );
      } catch (err) {
        throw new Error(err);
      }
    } else {
      this.itemValidationSchema = null;
    }

    // check that bucket has been passed if non-local
    if (!this.config.local && !this.config.s3.bucket) {
      throw new Error(
        'ArrayStream: config.s3.bucket is required if config.local === false',
      );
    }

    this.sep = '';
    this.count = 0;
    this.fileCount = 0;
    this.files = [];
    this.incrementKey();
    this.destroyed = false;
    this.outstream = null;
    if (!this.config.lazy) this.openOutstream();
  }

  /**
   * Close this ArrayStream and return a promise when
   * it has finished (see node stream 'finish' event).
   *
   * Call this to manually end this array stream and listen
   * for the finishing event.
   *
   * @return {(Promise|Promise)|Promise<void>}
   */
  closeArrayStream() {
    if (this.destroyed) return Promise.resolve();
    this.end();
    return new Promise(resolve => {
      this.on('finish', resolve);
    });
  }

  /**
   * Implement the writable _write method. Convert non-Buffer / non-string
   * chunk objects to JSON.stringified strings, and write them to the internal
   * outstream. If needed, reset the outstream and start writing to a new
   * file handle (if config maxItems has been exceeded).
   *
   * @param chunk
   * @param encoding
   * @param cb
   * @private
   */
  _write(chunk, encoding, cb) {
    if (this.destroyed) cb();
    if (this.config.lazy) {
      if (!this.outstream) this.openOutstream();
    }
    // validate chunk
    if (this.itemValidationSchema) {
      const { err } = this.validateChunk(chunk);
      if (err) return cb(new Error(err));
    }

    // convert chunk if needed
    if (
      !Buffer.isBuffer(chunk) &&
      !(typeof chunk == 'string' || chunk instanceof String)
    ) {
      try {
        chunk = JSON.stringify(chunk);
      } catch (err) {
        cb(new Error(err));
      }
    }

    try {
      if (this.count >= this.config.maxItems) {
        this.resetOutstream().then(() =>
          this.outstream.write(this.sep + chunk, () => {
            if (!this.sep) this.sep = SEPARATOR;
            this.incrementCount();
            cb();
          }),
        );
      } else {
        this.outstream.write(this.sep + chunk, () => {
          if (!this.sep) this.sep = SEPARATOR;
          this.incrementCount();
          cb();
        });
      }
    } catch (err) {
      cb(new Error(err));
    }
  }

  /**
   * Implement the Writable _final method. Callback when internal outstream
   * buffer has been flushed
   *
   * @param cb
   * @private
   */
  _final(cb) {
    // flush outstream
    this.flushOutstream(true)
      .then(() => {
        cb();
      })
      .catch(err => cb(err)); // cb and return
  }

  /**
   * If a validator is provided to this ArrayStream, validate it
   * before writing to the outstream
   *
   * @param chunk
   * @return {{err: *}|{err: null}}
   */
  validateChunk(chunk) {
    if (Buffer.isBuffer(chunk)) {
      chunk = chunk.toString();
    }
    try {
      const { error } = this.itemValidationSchema.validate(chunk);
      if (error) return { err: error };
      else return { err: null };
    } catch (err) {
      return { err };
    }
  }

  /**
   * Reset this ArrayStream's file handle / outstream. If final is true,
   * don't open a new outstream. Otherwise, increment this ArrayStream's
   * key, reset count, and open a new outstream to the new key. Returns
   * a Promise that resolves with the new outstream has been opened, or
   * when the old outstream has been cleaned up (when final is true).
   *
   * file_0000.json --> file_0001.json
   *
   * @param final
   * @return {Promise|Promise}
   */
  resetOutstream(final = false) {
    // IMPORTANT: make sure to call this below
    const cb = resolve => {
      if (this.outstream) {
        this.outstream.destroy();
      }
      // create new outstream and pipe to it
      if (!final) {
        // reset counter
        this.resetCount();
        this.incrementKey();
        this.openOutstream();
      } else {
        this.outstream = null;
      }
      resolve();
    };

    return new Promise((resolve, reject) => {
      if (this.config.local && this.config.verbose) {
        console.log(
          'ArrayStream: closing local fs stream',
          this.getConfig().filePath,
        );
      } else if (this.config.verbose) {
        console.log(
          'ArrayStream: closing AWS S3 ManagedUpload stream',
          `${this.getConfig().Bucket}: ${this.getConfig().Key}`,
        );
      }
      if (this.outstream) {
        this.outstream.end(']\n', () => {
          if (this.config.local) cb(resolve);
          else this.s3.promise().then(() => cb(resolve), reject);
        });
      } else {
        cb(resolve);
      }
    });
  }

  /**
   * Increment this ArrayStream's "key" / current file handle.
   *
   * file_0000.json --> file_0001.json
   */
  incrementKey() {
    this.key =
      this.config.s3.keyPattern.replace(
        /\$\$/,
        this.fileCount.toString().padStart(4, '0'),
      ) +
      '.' +
      this.config.s3.fileType;
    this.fileCount += 1;
  }

  /**
   * Increment the count for items written to the current file handle
   * @param count
   */
  incrementCount(count = 1) {
    this.count += count;
  }

  /**
   * Reset the count for items written to the current file handle
   */
  resetCount() {
    this.count = 0;
  }

  /**
   * Get the count of items written to this ArrayStream's current file handle
   *
   * @return {number}
   */
  getCount() {
    return this.count;
  }

  /**
   * Get the total count of items written of all of this ArrayStream's file
   * handles (past and current)
   *
   * @return {number}
   */
  getTotalCount() {
    if (this.files.length > 1)
      return (this.files.length - 1) * this.config.maxItems + this.count;
    return this.count;
  }

  /**
   * Get this ArrayStream's current filePath (local mode) or Bucket / Key
   * (s3 mode)
   *
   * @return {{Bucket: *, Key: string}|{filePath: string}}
   */
  getConfig() {
    if (this.config.local) {
      return {
        filePath: path.join(this.config.s3.folder, this.key),
      };
    } else {
      return {
        Bucket: this.config.s3.bucket,
        Key: path.join(this.config.s3.folder, this.key),
      };
    }
  }

  /**
   * Ensure that this ArrayStream's directory exists, otherwise create it
   */
  ensureFolder() {
    const folderPath = this.config.s3.folder;
    try {
      fs.statSync(folderPath);
    } catch (err) {
      fs.mkdirSync(folderPath, { recursive: this.config.mkdirRecursive });
    }
  }

  /**
   * Get list of files this ArrayStream has written to
   * @return {Array}
   */
  getFilePaths() {
    return this.files;
  }

  /**
   * Open an outstream to this ArrayStream's current file handle. Depending
   * on the settings specified in the constructor, this will either open an
   * append outstream to an existing file, overwrite an existing file, or
   * avoid existing files by incrementing the counter until a free "key"
   * is reached (i.e. if file_0000, file_0001, file_0002 all exist, the
   * ArrayStream will open file_0003). See the constructor for more details
   * on how to configure this.
   */
  openOutstream() {
    let params = this.getConfig();

    // check file exists && if append mode
    if (!this.config.append && !this.config.overwrite) {
      let newFile = true;
      while (newFile) {
        try {
          fs.statSync(params.filePath);
          this.incrementKey();
          params = this.getConfig();
        } catch (err) {
          newFile = false;
        }
      }
    }

    // logging
    if (this.config.local && this.config.verbose) {
      console.log('ArrayStream: opening local fs stream', params.filePath);
    } else if (this.config.verbose) {
      console.log(
        'ArrayStream: opening AWS S3 ManagedUpload stream',
        `${params.Bucket}: ${params.Key}`,
      );
    }

    // create overwrite or append writestream if in local mode
    if (this.config.local) {
      this.ensureFolder();
      // add file to files list
      this.files.push(params.filePath);
      try {
        if (this.config.overwrite) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error('Go to next catch statement');
        }
        const { size } = fs.statSync(params.filePath);
        if (this.config.debug)
          console.debug('ArrayStream: Opening append outstream. Size:', size);
        let useSep = false;
        if (size >= 3) {
          if (this.config.debug) console.debug('file size >=3 ');
          const buf = new Buffer.alloc(1);
          const fd = fs.openSync(params.filePath, 'r');
          const bytesRead = fs.readSync(fd, buf, 0, 1, size - 3);
          if (bytesRead === 1) {
            if (this.config.debug) console.debug('read 1 byte');
            const str = buf.toString();
            useSep = !(str === '[' || str === ',');
            if (this.config.debug)
              console.debug('got str', str, 'usesep', useSep);
          }
          fs.closeSync(fd);
        }
        this.outstream = fs.createWriteStream(params.filePath, {
          flags: 'a+',
          start: size - 2,
        });
        if (this.config.verbose)
          console.log(
            'ArrayStream: opening local fs stream in a+ mode',
            chalk.yellow(params.filePath),
          );
        this.sep = useSep ? SEPARATOR : '';
      } catch (err) {
        if (this.config.debug) console.error(err);
        if (this.config.debug)
          console.debug('ArrayStream: Opening overwrite outstream');
        this.outstream = fs.createWriteStream(params.filePath);
        if (this.config.verbose)
          console.log(
            'ArrayStream: opening local fs stream in w mode',
            chalk.yellow(params.filePath),
          );
        this.outstream.write('[');
        this.sep = '';
      }
    } else {
      this.files.push(params.Key);
      this.outstream = new PassThrough();
      this.s3 = new AWS.S3.ManagedUpload(
        Object.assign(params, {
          Body: this.outstream,
        }),
      );
      this.s3.on('httpUploadProgress', progress => {
        console.log('ArrayStream upload: ', progress);
      });
    }
  }

  /**
   * Flush this ArrayStream's buffer to file or s3 (depending on "local" config
   * setting). Returns a promise that resolves when this ArrayStream has flushed
   * its content
   *
   * @param final
   * @return {Promise<void>}
   */
  flushOutstream(final = false) {
    if (this.destroyed) return Promise.resolve();
    if (final) this.destroyed = true;
    // flush items to file here
    if (this.config.local && this.config.verbose) {
      console.log('ArrayStream flushBuffer: Flushing to local filesystem');
    } else if (this.config.verbose) {
      console.log('ArrayStream flushBuffer: Flushing to Amazon s3');
    }
    return this.resetOutstream(final);
  }
}

module.exports = { ArrayStream };
