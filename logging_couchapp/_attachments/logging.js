function Logging(app) {

  this.levels = ['debug', 'info', 'warn', 'error', 'fatal'];

  this.level_name = function( num ) {
    if (num >= 0 && num < this.levels.length) {
      return this.levels[num];
    }
    return null;
  };

  this.selector = function( str ) {
    return (new String(str)).replace(/[^A-Za-z0-9_]/g, '_');
  }

  this.app_id_row = function( app_id ) {
    var str = '<tr id="'+this.selector(app_id)+'"><td>'+app_id+'</td>';
    for (ii in this.levels) {
      str += '<td class="'+this.levels[ii]+'"></td>';
    }
    str += '</tr>';
    return str;
  };

};
