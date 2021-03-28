/**
 * @callback JoiValidate
 * @param {Object} value
 * @return {JoiValidationResult}
 */

/**
 * @typedef JoiValidationResult
 * @property {Error} [error]
 * @property {Object} [value]
 */

/**
 * @typedef {Object} JoiSchema
 * @property {function(...*): JoiSchema} any
 * @property {function(...*): JoiSchema} object
 * @property {function(...*): JoiSchema} string
 * @property {function(...*): JoiSchema} number
 * @property {function(...*): JoiSchema} integer
 * @property {function(...*): JoiSchema} boolean
 * @property {function(...*): JoiSchema} alternatives
 * @property {function(...*): JoiSchema} try
 * @property {function(...*): JoiSchema} array
 * @property {JoiValidate} validate
 */
