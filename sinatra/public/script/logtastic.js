
/**
 * @namespace The Logtastic namespace, <tt>logtastic</tt>. All public methods
 * and fields should be registered on this object.
 */
var logtastic = {};

(function(jq) {

/**
 *
 */
logtastic.ready = function( cmd ) {

    var callback = function( bundle ) {
        jq(function() {
            jq('body').append(
                '<div id="notice" class="ui-widget">' +
                '<div class="ui-corner-all">' +
                '<p><span class="ui-icon ui-icon-alert" style="float:left; margin-right:0.3em;"></span><span id="noticeText"></span></p>' +
                '</div></div>'
            );
            jq('#notice').hide().click(function() { jq(this).fadeOut(); });
            cmd(bundle);
        });
    };

    var bundleName = unescape(document.location.href).split('/')[3],
        bundle = logtastic.bundle(bundleName, callback);
};

/**
 * Takes a logtastic timestamp and returns a string representation that can be
 * parsed by the javascript Date object. This method accepts either a CouchDB
 * logtastic document or a timestamp string from a logtastic document.
 *
 * @param {object} obj the logtastic log event or a timestamp string
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
 * <tt>?name=Foo&level=1</tt> this method would return
 * <tt>{'name':'Foo', 'level':1}</tt>.
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
            diff < 86400 && Math.floor( diff / 3600 ) + " hours ago"
        ) ||
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
    jq('#noticeText').empty().text(' ' + msg).prepend('<strong>Alert:</strong>');
    jq('#notice').find('div')
        .removeClass('ui-state-error ui-state-highlight')
        .addClass('ui-state-error').end()
    .fadeIn('fast');
};

/**
 * 
 */
logtastic.info = function( msg ) {
    jq('#noticeText').empty().text(' ' + msg).prepend('<strong>Info:</strong>');
    jq('#notice').find('div')
        .removeClass('ui-state-error ui-state-highlight')
        .addClass('ui-state-highlight').end()
    .fadeIn('fast');
};


/* ---- Logtastic bundle interface ---------------------------------------- */

logtastic.bundle = function( name, ready ) {
    return new logtastic.Bundle(name, ready);
};

logtastic.Bundle = function( name, ready ) {
    this.name = name;
    this._ready = ready;
    this.levels = null;
    this.levelMap = null;
    this.appIds = null;
    this._getConfig();
};

jq.extend(logtastic.Bundle.prototype, {
    /**
     * Given a log event document, returns a level name. If the language or
     * log level does not correspond to a known level name then 'Unknown' is
     * returned.
     *
     * @parm {object} doc The log event document
     */
    levelName: function( doc ) {
        var ii = (typeof doc === 'object') ?  this.levelMap[doc._lang][doc.level] : parseInt(doc);

        if (ii !== undefined) {
            return this.levels[ii].capitalize();
        } else {
            return 'Unknown';
        }
    },

    /**
     * Given a log event document, returns a CSS color class for the log level
     * of the document. If the language or log level does not correspond to a
     * known level name then an empty string is returned.
     *
     * @parm {object} doc The log event document
     */
    cssColorClass: function( doc ) {
        var ii = this.levelMap[doc._lang][doc.level];

        if (ii !== undefined) {
            return 'color'+ii;
        } else {
            return '';
        }
    },

    /**
     *
     */
    eachLevel: function( callback ) {
        var self = this;
        jq.each(this.levels, function(ii, val) {
            callback(self.levelName(ii), ii);
        });
        return this;
    },

    /**
     *
     */
    eachAppId: function( callback ) {
        jq.each(this.appIds, function(ii, val) { callback(val, ii); });
        return this;
    },

    /**
     *
     */
    eachAppName: function( callback ) {
        if (!this._appNames) {
            var ary = [], current;
            this._appNames = [];

            jq.each(this.appIds, function(ii, val) { ary.push(val.name) });
            ary.sort();
            for (var ii=0; ii<ary.length; ii++) {
                if (current !== ary[ii]) {
                    current = ary[ii];
                    this._appNames.push(current);
                }
            }
        }
        jq.each(this._appNames, function(ii, name) { callback(name, ii) });
    },

    /**
     *
     */
    summaryData: function( callback ) {
        jq.getJSON('/' + this.name + '/summary_data', callback);
        return this;
    },

    /**
     *
     */
    events: function( opts ) {
        var callback = opts.success;
        delete opts.success;
        opts = JSON.stringify(opts)
        jq.getJSON('/' + this.name + '/events', {query: opts}, callback);
        return this;
    },

    /**
     * Helper method that makes an AJAX call to the server to retrieve the
     * configuration information for this bundle.
     */
    _getConfig: function() {
        var self = this,
            success = function( data ) {
                self.levels = data.levels;
                self.levelMap = data.levelMap;
                self.appIds = data.appIds;
                if (self._ready) { self._ready(self) }
                delete self._ready;
            };
        jq.getJSON('/' + this.name + '/config', success)
        return this;
    }
});


/* ---- Extensions of the core Javascript types --------------------------- */

function f(n) {    // Format integers to have at least two digits.
    return n < 10 ? '0' + n : n;
}

String.prototype.capitalize = function() {
    return this.replace(/\w+/g, function(s) {
        return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
    });
};

String.prototype.compare = function( other ) {
    return this > other ? 1 : this < other ? -1 : 0;
};

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

Date.prototype.toDateTime = function() {
    return this.getUTCFullYear()   + '-' +
         f(this.getUTCMonth() + 1) + '-' +
         f(this.getUTCDate())      + ' ' +
         f(this.getUTCHours())     + ':' +
         f(this.getUTCMinutes());
};

})(jQuery);
