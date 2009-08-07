
/**
 *
 */
logging.tailTable = function( opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table selector must be provided.'
    }
  }

  return new logging.TailTable(this.app, $(opts.table));
};

/**
 *
 */
logging.TailTable = function( app, table ) {

  var time = {
    format: 'normal',
    interval_id: 0
  };
  var startcount = 0;
  var filters = null;

  var poller = logging.logEventPoller({
    interval: 5000,
    success: function( json ) { addEvents(json); }
  });

  /**
   *
   */
  this.setup = function() {
    toggleTimeFormat();
    initScrolling();
    initFilters();

    $('#filter ul li').live('click', function() {
      $(this).toggleClass('selected');
      updateFilters();
      filter();
    });

    $('button.play', table).click(function() {
      if (poller.running()) {
        poller.stop();
        $(this).text('Play');
      } else {
        poller.start();
        $(this).text('Pause');
      }
    });

    $('thead th.timestamp', table).click(function() { toggleTimeFormat(); });
    $(window).resize(function() { initScrolling(); });
  };

  /**
   *
   */
  function start() {
    startcount += 1;
    if (startcount >= 1) {
      updateFilters();
      filter();
      poller.start();
    }
  };

  /**
   *
   */
  function initScrolling() {
    var tbody = $('tbody', table);

    var row_height = 0;
    if ($('tr:first-child', tbody).length > 0) {
      row_height = $('tr:first-child', tbody).attr('clientHeight');
    } else {
      tbody.append('<tr><td>&nbsp;</td></tr>');
      row_height = $('tr', tbody).attr('clientHeight');
      $('tr', tbody).remove();
    }

    var row_count = Math.floor($(window).height() / row_height) - 6;

    tbody.css('height', row_count*row_height);
    tbody.css('overflow-x', 'hidden');
    tbody.css('overflow-y', 'scroll');
  };

  /**
   *
   */
  function initFilters() {
    filters = {
      Application: {},
      Level: {},
      columns: [],
      forColumn: function(num) {
        if (num >=0 && num < this.columns.length) {
          return this[this.columns[num]];
        }
      }
    };

    $('thead tr:first th', table).each(function() {
      filters.columns.push($(this).text());
    });

    var list = $('#level ul');
    for (ii in logging.levels) {
      list.append('<li class="selected">'+logging.levelName(ii)+'</li>');
    }

    app.design.view('app_ids', {
      group: true,
      success: function(json) {
        var list = $('#application ul');
        for (ii in json.rows) {
          list.append('<li class="selected">'+json.rows[ii].key+'</li>');
        }
        start();
      }
    });
  };

  /**
   *
   */
  function toggleTimeFormat() {
    if (time.format === 'pretty') {
      if (time.interval_id !== 0) { clearInterval(time.interval_id); }
      time.interval_id = 0;
      time.format = 'normal';
      $('thead th.timestamp', table).css('width', '10.0em');
      prettyDate();
    } else {
      time.format = 'pretty';
      $('thead th.timestamp', table).css('width', '8.0em');
      prettyDate();
      time.interval_id = setInterval(function() { prettyDate() }, 5000);
    }
  };

  /**
   *
   */
  function prettyDate( timestamp ) {
    if (arguments.length == 1) {
      if (time.format === 'pretty') {
        return app.prettyDate(timestamp);
      } else {
        return timestamp.replace(/ UTC$/, '');
      }
    }

    $('td[data-timestamp]').each(function() {
      var e = $(this);
      e.text(prettyDate(e.attr('data-timestamp')));
    });
  };

  /**
   *
   */
  function addEvents( json ) {
    var tbody = $('tbody', table);
    for (var ii=json.rows.length-1; ii>=0; ii--) {
      var doc = json.rows[ii].doc;
      var timestamp = logging.formatTimestamp(doc);
      tbody.prepend(
        '<tr id="'+doc._id+'" class="color'+doc.level+'" style="display:none">'
        + '<td data-timestamp="'+timestamp+'">'+prettyDate(timestamp)+'</td>'
        + '<td>'+doc.app_id+'</td>'
        + '<td>'+doc.logger+'</td>'
        + '<td>'+logging.levelName(doc.level)+'</td>'
        + '<td>'+doc.message+'</td>'
        + '</tr>'
      );
      if (show(doc)) { $('tr:first', tbody).fadeIn('fast'); }
    }
    if (json.rows.length > 0) {
      var timestamp = new Date(logging.formatTimestamp(json.rows[0].doc));
      $('tfoot tr td:first-child', table).text("Latest: "+timestamp);
    }
  };

  /**
   *
   */
  function show( doc ) {
    if (!filters.Application[doc.app_id]) { return false; }
    if (!filters.Level[logging.levelName(doc.level)]) { return false; }
    return true;
  };

  /**
   *
   */
  function updateFilters() {
    $('#application ul li').each(function() {
      var li = $(this);
      if (li.hasClass('selected')) { filters.Application[li.text()] = true; }
      else { filters.Application[li.text()] = false; }
    });

    $('#level ul li').each(function() {
      var li = $(this);
      if (li.hasClass('selected')) { filters.Level[li.text()] = true; }
      else { filters.Level[li.text()] = false; }
    });
  };

  /**
   *
   */
  function filter() {
    $('tbody tr', table).each(function() {
      var row = $(this);
      $('td', row).each(function(col) {
        var col_filter = filters.forColumn(col);
        if (!col_filter) { return null; }
        if (col_filter[$(this).text()]) {
          $(this).removeClass('_hideme');
        } else {
          $(this).addClass('_hideme');
        }
      });

      if ($('td._hideme', row).length > 0) { row.hide(); }
      else { row.show(); }
    });
  };

};
