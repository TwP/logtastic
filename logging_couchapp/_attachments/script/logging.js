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

String.prototype.capitalize = function() {
  return this.replace(/\w+/g, function(s) {
    return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
  });
};
