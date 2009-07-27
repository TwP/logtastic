function Logging(app) {

  this.levels = ['debug', 'info', 'warn', 'error', 'fatal'];

  this.level_name = function( num ) {
    if (num >= 0 && num < this.levels.length) {
      return this.levels[num];
    }
    return 'unknown';
  };

  this.selector = function( str ) {
    return str.replace(/[^A-Za-z0-9_]/g, '_');
  }

  this.app_id_row = function( app_id ) {
    var str = '<tr id="'+this.selector(app_id)+'"><td>'+app_id+'</td>';
    for (ii in this.levels) {
      str += '<td class="count color'+ii+'"></td>';
    }
    str += '</tr>';
    return str;
  };

  this.log_event_row = function( doc ) {
    var timestamp = this.format_timestamp(doc);
    return '<tr id="'+doc._id+'" class="color'+doc.level+'">'
      + '<td data-timestamp="'+timestamp+'">'+app.prettyDate(timestamp)+'</td>'
      + '<td>'+doc.app_id+'</td>'
      + '<td>'+doc.logger+'</td>'
      + '<td>'+this.level_name(doc.level).capitalize()+'</td>'
      + '<td>'+doc.message+'</td>'
      + '</tr>';
  };

  this.format_timestamp = function( obj ) {
    var timestamp = obj.timestamp;
    if (timestamp == undefined) { timestamp = obj; }
    return timestamp.
        replace(/-/g,'/').
        replace(/T/, ' ').
        replace(/\.\d+Z$/, ' UTC');
  };
};

String.prototype.capitalize = function() {
  return this.replace(/\w+/g, function(s) {
    return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
  });
};
