const path = require('path');
const fs = require('fs');

/**
 * Class to represent a series of files
 *
 * e.g. file-0001.json, file-0002.json, ...
 *
 * @param dir 				Directory containing the files
 * @param keyPattern        Filename pattern to follow. Indices
 * 							will be matched with the '$$' sequence
 * 							e.g. file-$$.json --> file-001.json,
 * 							file-002.json, ...
 * @param fileType 			File extension - '.json', '.txt', ...
 * @param startIdx			Starting idx for file numbering
 * @param padDigits 		Number of digits to use in filenames
 * 							e.g. file-0004.json has a pad of 4
 */
class FileSeries {
  /**
   * Get a new file series object
   * @param dir 				Directory containing the files
   * @param keyPattern        Filename pattern to follow. Indices
   * 							will be matched with the '$$' sequence
   * 							e.g. file-$$.json --> file-001.json,
   * 							file-002.json, ...
   * @param fileType 			File extension - 'json', 'txt', 'csv', ...
   * @param startIdx			Starting idx for file numbering
   * @param padDigits 		Number of digits to use in filenames
   * 							e.g. file-0004.json has a pad of 4
   */
  constructor(dir, keyPattern, fileType = 'json', startIdx = 0, padDigits = 4) {
    this.dir = dir;
    this.keyPattern = keyPattern;
    this.fileType = fileType;
    this.padDigits = padDigits;
    this.currentIdx = startIdx;

    // trim . at the beginning of fileType
    if (this.fileType.startsWith('.')) {
      this.fileType = this.fileType.replace(new RegExp('^.'), '');
    }
    // trim excessive file types at the end of keyPattern
    if (this.keyPattern.endsWith('.' + this.fileType)) {
      this.keyPattern = this.keyPattern.replace(
        new RegExp(`.${this.fileType}$`),
        '',
      );
    }

    this.currentKey = FileSeries.formatKey(
      this.currentIdx,
      this.dir,
      this.keyPattern,
      this.fileType,
      this.padDigits,
    );
    this.getNewKey();
    return this;
  }

  static formatKey(idx, dir, keyPattern, fileType, padDigits = 4) {
    return (
      path.join(
        dir,
        keyPattern.replace(/\$\$/, idx.toString().padStart(padDigits, '0')),
      ) +
      '.' +
      fileType
    );
  }

  /**
   * Get this series' current key. e.g.
   *
   * `someDirectory/someKeyPattern_0002.json`
   *
   * @return {string}
   */
  getCurrentKey() {
    return this.currentKey;
  }

  /**
   * Increment this series' current key
   *
   * `someDirectory/someKeyPattern_0002.json` -->
   * `someDirectory/someKeyPattern_0003.json`
   *
   */
  incrementKey() {
    this.currentIdx += 1;
    this.currentKey = FileSeries.formatKey(
      this.currentIdx,
      this.dir,
      this.keyPattern,
      this.fileType,
      this.padDigits,
    );
  }

  /**
   * Check the filesystem for existing files, and continue
   * incrementing this series' key until a non-conflicting key
   * is found.
   *
   * @return {*}
   */
  getNewKey() {
    let fileExists = true;
    while (fileExists) {
      try {
        fs.statSync(this.currentKey);
        this.incrementKey();
      } catch (err) {
        fileExists = false;
      }
    }
    return this.currentKey;
  }

  /**
   * Get the current idx of this series.
   *
   * `someDirectory/someKeyPattern_0002.json` --> idx === 2
   *
   * @return {number} 			returns 2
   */
  getCurrentIndex() {
    return this.currentIdx;
  }
}

module.exports = { FileSeries };
