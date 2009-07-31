
var Grapher = function( app, opts ) {
  var app_id = opts.app_id;
  var type = opts.type;
  var step = 3600 * 1000;
  var colors = ['#469', '#099', '#444', '#880', '#a22'];
  var datasets = null;

  this.reset = function() {
    var ary = [];
    $.each(Logging.levels, function(index, level) {
      ary.push({
        label: level.capitalize(),
        color: colors[index],
        data: []
      });
    });
    datasets = ary;
  };
  this.reset();

  // TODO: document this function
  function homogenize ( json, s, e ) {
    if (json.rows.length === 0) { return null; }

    var rows   = json.rows,
        length = json.rows.length;

    var start = Date.parse(s),
        end   = new Date();
    end.setUTCMinutes(0);
    end.setUTCSeconds(0);

    var row = null;

    for (var time=start; time<=end; time+=step) {
      var timestamp = (new Date(time)).toUTC();

      for (var level=0; level<Logging.levels.length; level++) {
        if (!row) { row = rows.shift(); }

        if (row && row.key[0] === timestamp && row.key[2] === level) {
          datasets[level].data.push([time, row.value]);
          row = null;
        } else {
          datasets[level].data.push([time, 0]);
        }
      }
    }
  }

  // TODO: document
  function display( json, s, e ) {
    homogenize(json, s, e);
    $.plot($("#"+type), datasets, {
      yaxis: { min: 0 },
      xaxis: { tickDecimals: 0, mode: 'time' }
    });
  }

  // TODO: document
  this.poll = function() {
    var end = this.end();
    var start = (new Date(Date.parse(end) - (24*step))).toUTC();
    app.design.view(type, {
      group: true,
      startkey: [start],
      endkey: [end],
      success: function(json) {
        var ary = [];
        for (ii in json.rows) {
          if (app_id === json.rows[ii].key[1]) { ary.push(json.rows[ii]); }
        }
        json.rows = ary;
        display(json, start, end);
      }
    });
  };

  // TODO: document
  this.end = function() {
    time = (new Date()).getTime();
    time = new Date(time + step);
    time.setUTCMinutes(0);
    time.setUTCSeconds(0);
    return time.toUTC();
  };

};
