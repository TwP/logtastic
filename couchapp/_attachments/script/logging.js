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
logging.app = null;

/**
 * The names associated with numeric log levels.
 *
 * @type array
 */
logging.levels = ['debug', 'info', 'warn', 'error', 'fatal'];

/**
 *
 */
logging.levelMap = {
  // Ruby logging levels
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  // Java Log4j levels
  10000: 0,
  20000: 1,
  30000: 2,
  40000: 3,
  50000: 4,
  // Python logging levels
  10: 0,
  20: 1,
  30: 2,
  40: 3,
  50: 4
}

/**
 * Given a level number, returns a level name. If the level number does not
 * correspond to a known level name then 'Unknown' is returned.
 *
 * @parm {number} num the level number
 */
logging.levelName = function( num ) {
  ii = this.levelMap[num];
  if (ii !== undefined) {
    return this.levels[ii].capitalize();
  } else {
    return 'Unknown';
  }
};

/**
 *
 */
logging.cssColorClass = function( num ) {
  ii = this.levelMap[num];
  if (ii !== undefined) {
    return 'color'+ii;
  } else {
    return '';
  }
};

/**
 * Takes a logging timestamp and returns a string representation that can be
 * parsed by the javascript Date object. This method accepts either a CouchDB
 * logging document or a timestamp string from a logging document.
 *
 * @param {object} obj the CouchDB logging document or a timestamp string
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
 * Takes an <tt>app_id</tt> and returns a formatted version suitable for use as
 * a CSS selector. This method does not prepend a hash symbol, so you will need
 * to manually add that in order to select the desired element via JQuery.
 *
 * @param {object} obj the CouchDB logging document or an app_id string
 */
logging.cssSelector = function( obj ) {
  var app_id = obj.app_id;
  if (app_id === undefined) { app_id = obj; }
  return app_id.replace(/[^A-Za-z0-9_]/g, '_');
};

/**
 * Parses the search parameters from the page URI and returns them as members
 * of an object. For example, if the URI has the following search string
 * <tt>?app_id=Foo&level=1</tt> this method would return
 * <tt>{'app_id':'Foo', 'level':1}</tt>.
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
