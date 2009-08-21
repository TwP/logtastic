
logging.grapher = function( opts ) {
  var app_id = opts.app_id;
  var type = opts.type;
  var step = undefined;

  if (!app_id && typeof app_id !== 'string') {
    throw {
      name: 'ArgumentError',
      message: 'An app_id must be provided in order for graphs to be generated.'
    }
  }

  switch (type) {
  case 'hourly':
    step = 3600 * 1000;
    break;
  case 'daily':
    step = 86400 * 1000;
    break;
  default:
    throw {
      name: 'ArgumentError',
      message: 'Unknown graph type: ' + type
    }
  }

  var grapher = new logging.Grapher(app_id, type, step);
  grapher.reset();
  return grapher;
};

logging.Grapher = function( app_id, type, step ) {
  var colors = ['#469', '#099', '#444', '#880', '#a22'];
  var datasets = null;

  this.reset = function() {
    var ary = [];
    $.each(logging.levels, function(index, level) {
      ary.push({
        label: logging.levelName(index),
        color: colors[index],
        data: [],
        shadowSize: 0
      });
    });
    datasets = ary;
  };

  function homegenize( json, s, e ) {
    if (json.rows.length === 0) { return null; }

    var rows   = json.rows,
        length = json.rows.length;

    var start = Date.parse(s),
        end   = new Date();
    end.setUTCMinutes(0);
    end.setUTCSeconds(0);

    var row = null,
        data = {zeros: []};
    for (ii in logging.levels) { data.zeros.push(0); }

    for (var time=start; time<=end; time+=step) {
      timestamp = (new Date(time)).toUTC();
      levels = data[timestamp] = data.zeros.slice(0);

      if (!row) { row = rows.shift(); }

      while (row && row.key[1] === timestamp) {
        level = logging.levelMap[row.key[2]];
        levels[level] += row.value;
        row = rows.shift();
      }
    }

    for (var time=start; time<=end; time+=step) {
      timestamp = (new Date(time)).toUTC();
      $.each(data[timestamp], function(ii, val) {
        datasets[ii].data.push([time, val]);
      });
    }
  };

  function display() {
    $.plot($("#"+type), datasets, {
      yaxis: { min: 0 },
      xaxis: { tickDecimals: 0, mode: 'time' },
      legend: {
        show: true,
        container: $('#'+type+'Legend')
      }
    });
  };

  this.poll = function() {
    var end = this.end();
    var start = (new Date(Date.parse(end) - (24*step))).toUTC();
    logging.view(type, {
      group: true,
      startkey: [app_id, start],
      endkey: [app_id, end],
      success: function(json) {
        homegenize(json, start, end);
        display();
      }
    });
  };

  this.end = function() {
    time = (new Date()).getTime();
    time = new Date(time + step);

    switch (type) {
    case 'hourly':
      time.setUTCMinutes(0);
      time.setUTCSeconds(0);
      break;
    case 'daily':
      time.setUTCHours(0);
      time.setUTCMinutes(0);
      time.setUTCSeconds(0);
      break;
    }

    return time.toUTC();
  };
};
