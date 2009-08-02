function Logging(app) {

  this.selector = function( str ) {
    return str.replace(/[^A-Za-z0-9_]/g, '_');
  }

  this.app_id_row = function( app_id ) {
    var str = '<tr id="'+this.selector(app_id)+'"><td>'+app_id+'</td>';
    for (ii in Logging.levels) {
      str += '<td class="count color'+ii+'"></td>';
    }
    str += '</tr>';
    return str;
  };

};

Logging.levels = ['debug', 'info', 'warn', 'error', 'fatal'];

Logging.level_name = function( num ) {
  if (num >= 0 && num < Logging.levels.length) {
    return Logging.levels[num];
  }
  return 'unknown';
};

Logging.format_timestamp = function( obj ) {
  var timestamp = obj.timestamp;
  if (timestamp == undefined) { timestamp = obj; }
  return timestamp.
      replace(/-/g,'/').
      replace(/T/, ' ').
      replace(/\.\d+Z$/, ' UTC');
};

var searchParams = function() {
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
