
/**
 *
 */
logging.eventTable = function( opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table selector must be provided.'
    }
  }

  return new logging.EventTable($(opts.table));
};

/**
 *
 */
logging.EventTable = function( table ) {

  var self = this;
  var tbody = $('tbody', table);

  var time = {
    format: 'normal',
    interval_id: 0,
    head: '',
    tail: '~',

    toggleFormat: function() {
      if (this.format === 'pretty') {
        if (this.interval_id !== 0) { clearInterval(this.interval_id); }
        this.interval_id = 0;
        this.format = 'normal';
        $('thead th.timestamp', table).css('width', '10.0em');
        prettyDate();
      } else {
        this.format = 'pretty';
        $('thead th.timestamp', table).css('width', '8.0em');
        prettyDate();
        this.interval_id = setInterval(function() { prettyDate() }, 10000);
      }
    }
  };

  $('thead button', table).click(function() {
    var start = time.head === '' ? (new Date()).toCouchDB() : time.head;

    logging.view('events', {
      include_docs: true,
      startkey: start,
      limit: 23,
      success: function(json) {
        if (json.rows.length > 1) {
          $.each(json.rows, function(ii, row) { self.prepend(row.doc); });
        } else {
          logging.info('At the newest logging event.');
        }
      }
    });
  });

  $('tfoot button', table).click(function() {
    var start = time.tail === '~' ? (new Date()).toCouchDB() : time.tail;

    logging.view('events', {
      include_docs: true,
      descending: true,
      startkey: start,
      limit: 23,
      success: function(json) {
        if (json.rows.length > 1) {
          $.each(json.rows, function(ii, row) { self.append(row.doc); });
        } else {
          logging.info('At the oldest logging event.');
        }
      }
    });
  });

  /**
   *
   */
  this.setup = function() {
    time.toggleFormat();
    initScrolling();

    $('thead th.timestamp', table).click(function() { time.toggleFormat(); });
    $(window).resize(function() { initScrolling(); });
  };

  /**
   *
   */
  this.columnNames = function() {
    ary = []
    $('thead tr:first th', table).each(function() {
      ary.push($(this).text());
    });
    return ary;
  }

  this.prepend = function( doc ) {
    if (document.getElementById(doc._id)) { return; }
    tbody.prepend(row(doc));
    showRow(doc);
    time.head = doc.timestamp;
  };

  this.append = function( doc ) {
    if (document.getElementById(doc._id)) { return; }
    tbody.append(row(doc));
    showRow(doc);
    time.tail = doc.timestamp;
  };

  this.insert = function( doc ) {
    if (document.getElementById(doc._id)) { return; }

    // initialization case (no rows have yet been added)
    if (time.head === '') {
      this.prepend(doc);
      time.head = time.tail = doc.timestamp;
      return;
    };

    // prepend the document if timestamp is greater than our head
    if (doc.timestamp.compare(time.head) >= 0) {
      this.prepend(doc);
      return;
    };

    // append the document if timestamp is less than our tail
    if (doc.timestamp.compare(time.tail) < 0) {
      this.append(doc);
      return;
    };

    // otherwise we need to search through all rows for the insert location
    $('tr', tbody).each(function() {
      tr = $(this);
      ts = tr.attr('data-sortby');
      if (doc.timestamp.compare(ts) >= 0) {
        tr.before(row(doc));
        showRow(doc);
        return false;  // break out of the each loop
      }
    });
  };

  /**
   *
   */
  function initScrolling() {
    row_height = 0;
    if ($('tr:first-child', tbody).length > 0) {
      row_height = $('tr:first-child', tbody).attr('clientHeight');
    } else {
      tbody.append('<tr><td>&nbsp;</td></tr>');
      row_height = $('tr', tbody).attr('clientHeight');
      $('tr', tbody).remove();
    }

    row_count = Math.floor($(window).height() / row_height) - 6;

    tbody.css('height', row_count*row_height);
    tbody.css('overflow-x', 'hidden');
    tbody.css('overflow-y', 'scroll');
  };

  /**
   *
   */
  function prettyDate( timestamp ) {
    if (arguments.length == 1) {
      if (time.format === 'pretty') {
        return logging.prettyDate(timestamp);
      } else {
        return timestamp.replace(/ UTC$/, '');
      }
    }

    $('td[data-timestamp]', tbody).each(function() {
      e = $(this);
      e.text(prettyDate(e.attr('data-timestamp')));
    });
  };

  /**
   *
   */
  this.empty = function() {
    tbody.empty();
    time.head = '';
    time.tail = '~';
  };

  /**
   *
   */
  this.addEvents = function( json ) {
    for (var ii=json.rows.length-1; ii>=0; ii--) {
      this.insert(json.rows[ii].doc);
    }
    timestamp = new Date(logging.formatTimestamp(time.head));
    $('tfoot tr td:first-child', table).text("Latest: "+timestamp);
  };

  var show = function( doc ) { return true; };
  this.setShow = function( fn ) { show = fn; }

  /**
   *
   */
  this.eachRow = function( callback ) {
    $('tr', tbody).each(callback);
  };

  /**
   *
   */
  function row( doc ) {
    timestamp = logging.formatTimestamp(doc);
    return '<tr id="'+doc._id+'" class="'+logging.cssColorClass(doc.level)+'" style="display:none" data-sortby="'+doc.timestamp+'">'
        + '<td data-timestamp="'+timestamp+'">'+prettyDate(timestamp)+'</td>'
        + '<td>'+doc.app_id+'</td>'
        + '<td>'+doc.logger+'</td>'
        + '<td>'+logging.levelName(doc.level)+'</td>'
        + '<td colspan="2"></td>'
        + '</tr>'
  };

  /**
   *
   */
  function showRow( doc ) {
    msg = typeof doc.message === 'string' ?
          doc.message : JSON.stringify(doc.message);

    r = $('#'+doc._id);
    $('td:last-child', r).text(msg);
    if (show(doc)) { r.fadeIn('fast'); }
  };
};
