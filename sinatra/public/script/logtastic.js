/**
 * @namespace The Logtastic namespace, <tt>logtastic</tt>. All public methods
 * and fields should be registered on this object.
 */
var logtastic = {};

/**
 *
 */
logtastic.ready = function( cmd ) {

  String.prototype.capitalize = function() {
    return this.replace(/\w+/g, function(s) {
      return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
    });
  };

  String.prototype.compare = function( other ) {
    return this > other ? 1 : this < other ? -1 : 0;
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

  Date.prototype.toMongoDB = function() {
      return this.getUTCFullYear()   + '-' +
           f(this.getUTCMonth() + 1) + '-' +
           f(this.getUTCDate())      + 'T' +
           f(this.getUTCHours())     + ':' +
           f(this.getUTCMinutes())   + ':' +
           f(this.getUTCSeconds())   + '.000Z';
  };

  Date.prototype.toJSON = function() {
      return this.getUTCFullYear()   + '/' +
           f(this.getUTCMonth() + 1) + '/' +
           f(this.getUTCDate())      + ' ' +
           f(this.getUTCHours())     + ':' +
           f(this.getUTCMinutes())   + ':' +
           f(this.getUTCSeconds())   + ' +0000';
  };

  Date.prototype.toDateTime = function() {
      return this.getUTCFullYear()   + '-' +
           f(this.getUTCMonth() + 1) + '-' +
           f(this.getUTCDate())      + ' ' +
           f(this.getUTCHours())     + ':' +
           f(this.getUTCMinutes());
  };

  // This function will be executed when the document is ready
  $(function() {
    var dbname = document.location.href.split('/')[3];
    var dname = unescape(document.location.href).split('/')[5];
    var db = $.couch.db(dbname);

    $('body').append(
      '<div id="notice" class="ui-widget">' +
      '<div class="ui-corner-all">' +
      '<p><span class="ui-icon ui-icon-alert" style="float:left; margin-right:0.3em;"></span><span id="noticeText"></span></p>' +
      '</div></div>'
    );
    $('#notice').hide().click(function() { $(this).fadeOut(); });

    /**
     *
     */
    logtastic.view = function( view, options ) {
      options = $.extend({
          error: function(status, error, reason) {
            logtastic.alarm('Could not access view "'+view+'" :: '+reason);
          }}, options);

      db.view(dname+'/'+view, options);
    };

    /**
     *
     */
    logtastic.doc = function( id, options ) {
      options = $.extend({
          error: function(status, error, reason) {
            logtastic.alarm('Could not open document "'+ id + '" :: ' + reason);
          }}, options);
      db.openDoc(id, options);
    };

    var count = 0;
    var app_ids = {};

    function success() {
      count += 1;
      if (count >= 1) {
        logtastic.app_ids = app_ids;
        cmd();
      }
    }

    logtastic.view('latest', {
      group_level: 2,
      success: function(json) {
        for (ii in json.rows) {
          id = json.rows[ii].key[0]
          level = json.rows[ii].key[1]

          if (app_ids[id] === undefined) {app_ids[id] = {}}
          app_ids[id][logtastic.levelMap[level]] = level;
        }
        success();
      }
    });
  });
};

/**
 * A list of all the unique "app_id" values in the CouchDB database.
 *
 * @type array
 */
logtastic.app_ids = null;

/**
 * The names associated with numeric log levels.
 *
 * @type array
 */
logtastic.levels = ['debug', 'info', 'warn', 'error', 'fatal'];

/**
 *
 */
logtastic.levelMap = {
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
logtastic.levelName = function( num ) {
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
logtastic.cssColorClass = function( num ) {
  ii = this.levelMap[num];
  if (ii !== undefined) {
    return 'color'+ii;
  } else {
    return '';
  }
};

/**
 * Takes a logtastic timestamp and returns a string representation that can be
 * parsed by the javascript Date object. This method accepts either a CouchDB
 * logtastic document or a timestamp string from a logtastic document.
 *
 * @param {object} obj the CouchDB logtastic document or a timestamp string
 */
logtastic.formatTimestamp = function( obj ) {
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
 * @param {object} obj the CouchDB logtastic document or an app_id string
 */
logtastic.cssSelector = function( obj ) {
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
logtastic.searchParams = function() {
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

/**
 *
 */
logtastic.eachLevel = function( callback ) {
  $.each(logtastic.levels, function(ii, val) {
    callback(logtastic.levelName(ii));
  });
};

/**
 *
 */
logtastic.eachAppId = function( callback ) {
  $.each(logtastic.app_ids, function(key, val) { callback(key); });
};

/**
 *
 */
logtastic.prettyDate = function( time ) {
  var date = new Date(time),
      diff = (((new Date()).getTime() - date.getTime()) / 1000),
      day_diff = Math.floor(diff / 86400);

  // if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 ) return;

  return day_diff < 1 && (
                  diff < 60 && "just now" ||
                  diff < 120 && "1 minute ago" ||
                  diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
                  diff < 7200 && "1 hour ago" ||
                  diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
          day_diff == 1 && "yesterday" ||
          day_diff < 21 && day_diff + " days ago" ||
          day_diff < 45 && Math.ceil( day_diff / 7 ) + " weeks ago" ||
          day_diff < 730 && Math.ceil( day_diff / 31 ) + " months ago" ||
          Math.ceil( day_diff / 365 ) + " years ago";
};

/**
 * 
 */
logtastic.alarm = function( msg ) {
  $('#noticeText').empty().text(' ' + msg).prepend('<strong>Alert:</strong>');
  $('#notice').find('div').removeClass('ui-state-error ui-state-highlight')
              .addClass('ui-state-error').end().fadeIn('fast');
};

/**
 * 
 */
logtastic.info = function( msg ) {
  $('#noticeText').empty().text(' ' + msg).prepend('<strong>Info:</strong>');
  $('#notice').find('div').removeClass('ui-state-error ui-state-highlight')
              .addClass('ui-state-highlight').end().fadeIn('fast');
};
