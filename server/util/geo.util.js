const geohash = require('ngeohash');

/**
 * Throws an error if lat or lng is invalid, otherwise
 * does nothing
 *
 * @param {{lat:{number}, lng:{number}}|{latitude:{number}, longitude:{number}}} latLng
 */
function validateLatLng(latLng) {
  if (!latLng.lat && !latLng.latitude)
    throw new Error('validateLatLng: latLng.lat is required');
  if (!latLng.lng && !latLng.longitude)
    throw new Error('validateLatLng: latLng.lng is required');
  const lat = latLng.lat || latLng.latitude;
  const lng = latLng.lng || latLng.longitude;
  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude ${lat}. Must be between -90 and +90`);
  }
  if (lng < -180 || lng > 180) {
    throw new Error(`Invalid longitude ${lng}. Must be between -180 and 180`);
  }
}

/**
 * Get a geo hash from a latLng config
 *
 * @param {{lat:{number}, lng:{number}}|{latitude:{number}, longitude:{number}}} latLng
 * @param precision
 */
function getGeoHash(latLng, precision = 9) {
  validateLatLng(latLng);
  const lat = latLng.lat || latLng.latitude;
  const lng = latLng.lng || latLng.longitude;
  return geohash.encode(lat, lng, precision);
}

module.exports = { validateLatLng, getGeoHash };
