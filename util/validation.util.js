const ObjectId = require('mongoose').Types.ObjectId;
const { Joi } = require('celebrate');

const OBJECT_ID_VALIDATION_SCHEMA = Joi.custom(value => {
  return ObjectId(value);
});
const { ALLOWED_TYPES, VENUE_TAG_FIELD_NAMES } = require('../mongo/models/venue_tag.model.constants');
const { USER_VENUE_TAG_FIELD_NAMES } = require('../mongo/models/user_venue_tag.model.constants');

/**
 * @typedef {Object} VenueTagsSearchObjectSchema
 * @property {string} type {@link ALLOWED_TYPES}
 * @property {string} field
 * @property {value} value
 */
const VENUE_TAGS_SEARCH_OBJ_VALIDATION_SCHEMA = Joi.object({
  type: Joi.string().allow(...ALLOWED_TYPES).required(),
  field: Joi.string().allow(...Object.values(VENUE_TAG_FIELD_NAMES).concat(Object.values(USER_VENUE_TAG_FIELD_NAMES))).required(),
  value: Joi.string().required(),
});

/**
 * @typedef {Object} VenueTagsBoolSearchObjectSchema
 * @property {Array<VenueTagsSearchObjectSchema>} should
 * @property {Array<VenueTagsSearchObjectSchema>} must
 * @property {Array<VenueTagsSearchObjectSchema>} shouldNot
 * @property {Array<VenueTagsSearchObjectSchema>} mustNot
 * @property {number} minimumShouldMatch
 */
const VENUE_TAGS_BOOL_SEARCH_OBJ_VALIDATION_SCHEMA = Joi.object({
  should: Joi.array().items(VENUE_TAGS_SEARCH_OBJ_VALIDATION_SCHEMA).default([]),
  must: Joi.array().items(VENUE_TAGS_SEARCH_OBJ_VALIDATION_SCHEMA).default([]),
  shouldNot: Joi.array().items(VENUE_TAGS_SEARCH_OBJ_VALIDATION_SCHEMA).default([]),
  mustNot: Joi.array().items(VENUE_TAGS_SEARCH_OBJ_VALIDATION_SCHEMA).default([]),
  minimumShouldMatch: Joi.number().integer().default(1).min(0),
});

/**
 * @typedef {Object} ElasticSortFieldObject
 * @property {string} order 'asc' or 'desc' {@link https://www.elastic.co/guide/en/elasticsearch/reference/6.8/search-request-sort.html#_sort_order}
 * @property {string} [mode] 'min', 'max', 'sum', 'avg', 'median'
 * @property {string} [missing] '_first', '_last' {@link https://www.elastic.co/guide/en/elasticsearch/reference/6.8/search-request-sort.html#_missing_values}
 */
const ELASTIC_SORT_FIELD_OBJ_VALIDATION_SCHEMA = Joi.object({
  order: Joi.string().required().allow('asc', 'desc'),
  mode: Joi.string().optional().allow('min', 'max', 'sum', 'avg', 'median'),
  missing: Joi.string().optional().allow('_first', '_last'),
});

/**
 * @typedef {Object} ElasticVenuesFlagsValidationSchema
 * @description
 * For use on search endpoints.
 * @example
 * POST "/api/venues/lookup-v2" --data "{ ..., \"flags\": { \"approved\": true }}"
 * RETURN ["... venues with the 'approved' flag"]
 * @property {boolean} [approved] Admin only flag. If true, return only approved venues
 * @property {boolean} [closed]
 * @property {boolean} [featured]
 * @property {boolean} [hidden] Admin only flag. If true, return only hidden venues
 * @property {boolean} [verified]
 * @property {boolean} [capacity] Admin only flag. If false, return venues with null capacity
 * @property {boolean} [bookingType] Admin only flag. If false, return venues with empty or undefined array bookingType
 * @property {boolean} [directory] Admin only flag. If false, return venues with empty or undefined array directory
 * @property {boolean} [extraSocials] Admin only flag. If false, return venues with empty or undefined array extraSocials
 * @property {boolean} [extraLinks] Admin only flag. If false, return venues with empty or undefined array extraLinks
 * @property {boolean} [extraIndustryTypes] Admin only flag. If false, return venues with empty or undefined array extraIndustryTypes
 * @property {boolean} [genres] Admin only flag. If false, return venues with empty or undefined array genres
 * @property {boolean} [images] Admin only flag. If false, return venues with empty or undefined array images
 * @property {boolean} [links] Admin only flag. If false, return venues with empty or undefined array links
 * @property {boolean} [notes] Admin only flag. If false, return venues with empty or undefined array notes
 * @property {boolean} [notgenres] Admin only flag. If false, return venues with empty or undefined array notgenres
 * @property {boolean} [social] Admin only flag. If false, return venues with empty or undefined array social
 * @property {boolean} [videos] Admin only flag. If false, return venues with empty or undefined array videos
 * @property {boolean} [videos] Admin only flag. If false, return venues with empty or no website link
 */
const VENUE_FLAGS_OBJ_VALIDATION_SCHEMA = Joi.object({
  approved: Joi.boolean().optional(),
  closed: Joi.boolean().optional(),
  featured: Joi.boolean().optional(),
  hidden: Joi.boolean().optional(),
  verified: Joi.boolean().optional(),
  capacity: Joi.boolean().optional(),
  contacts: Joi.boolean().optional(),
  bookingType: Joi.boolean().optional(),
  directory: Joi.boolean().optional(),
  extraSocials: Joi.boolean().optional(),
  extraLinks: Joi.boolean().optional(),
  extraIndustryTypes: Joi.boolean().optional(),
  genres: Joi.boolean().optional(),
  images: Joi.boolean().optional(),
  links: Joi.boolean().optional(),
  notes: Joi.boolean().optional(),
  notgenres: Joi.boolean().optional(),
  social: Joi.boolean().optional(),
  videos: Joi.boolean().optional(),
  website: Joi.boolean().optional(),
});

module.exports = {
  OBJECT_ID_VALIDATION_SCHEMA,
  ELASTIC_SORT_FIELD_OBJ_VALIDATION_SCHEMA,
  VENUE_FLAGS_OBJ_VALIDATION_SCHEMA,
  VENUE_TAGS_SEARCH_OBJ_VALIDATION_SCHEMA,
  VENUE_TAGS_BOOL_SEARCH_OBJ_VALIDATION_SCHEMA
};
