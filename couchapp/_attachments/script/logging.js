/**
 * @namespace The Logging namespace, <tt>logging</tt>. All public methods
 * and fields should be registered on this object.
 */
var logging = {};

/**
 * The CouchDB instance that contains the Logging couchapp we will
 * communicate with.
 *
 * @type couch_db
 */
logging.app = undefined;

/**
 * The names associated with numeric log levels.
 *
 * @type array
 */
logging.levels = ['debug', 'info', 'warn', 'error', 'fatal'];

/**
 *
 */
logging.levelName = function( num ) {
  if (num >= 0 && num < this.levels.length) {
    return this.levels[num].capitalize();
  } else {
    return 'Unknown';
  }
};

/**
 *
 */
logging.formatTimestamp = function( obj ) {
  var ts = obj.timestamp;
  if (ts === undefined) { ts = obj; }
  return ts.
      replace(/-/g,'/').
      replace(/T/, ' ').
      replace(/\.\d+Z$/, ' UTC');
};

/**
 *
 */
logging.cssSelector = function( obj ) {
  var app_id = obj.app_id;
  if (app_id === undefined) { app_id = obj; }
  return app_id.replace(/[^A-Za-z0-9_]/g, '_');
};

/**
 *
 */
logging.searchParams = function() {
  var obj = {};
  var search = window.location.search;
  if (search.length === 0) { return obj; }

  search = search.replace(/\?/, '').replace(/%20/g, ' ').split('&');
  for (ii in search) {
    var ary = search[ii].split('=');
    obj[ary[0]] = ary[1];
  }
  return obj;
};


// Helper methods below this line
// -------------------------------------------------------------------------
String.prototype.capitalize = function() {
  return this.replace(/\w+/g, function(s) {
    return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
  });
};

function f(n) {    // Format integers to have at least two digits.
  return n < 10 ? '0' + n : n;
}

Date.prototype.toUTC = function() {
    return this.getUTCFullYear()   + '/' +
         f(this.getUTCMonth() + 1) + '/' +
         f(this.getUTCDate())      + ' ' +
         f(this.getUTCHours())     + ':' +
         f(this.getUTCMinutes())   + ':' +
         f(this.getUTCSeconds())   + ' UTC';
};
