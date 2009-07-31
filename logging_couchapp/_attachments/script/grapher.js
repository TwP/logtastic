
var Grapher = function( app, opts ) {
  this.app = app;
};

Grapher.prototype.homogenize = function( json ) {
  if (json.rows.length === 0) { return null; }

  var rows   = json.rows,
      length = json.rows.length;

  var start = Date.parse(rows[0].key[0]),
      end   = Date.parse(rows[length-1].key[0]),
      step  = 3600 * 1000;

  var row = null,
      ary = [];

  for (var time=start; time<=end; time+=step) {
    var current = {timestamp: (new Date(time)).toUTC(), levels: []};
    ary.push(current);

    for (var level=0; level<Logging.levels.length; level++) {
      if (!row) { row = rows.shift(); }

      if (row && row.key[0] === current.timestamp && row.key[2] === level) {
        current.levels.push(row.value);
        row = null;
      } else {
        current.levels.push(0);
      }
    }
  }

  return ary;
};
