var TailTable = function( app, opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table selector must be provided.'
    }
  }

  this.app = app;
  this.table = $(opts.table);

  this.initTimeFormatter();
  this.initScrolling();
  this.initFilters();

  var that = this;
  $('#filter ul li').live('click', function() {
    $(this).toggleClass('selected');
    that.updateFilters();
    that.filter();
  });
};


TailTable.prototype.start = function() {
  if (!this.start_count) { this.start_count = 0; }
  this.start_count += 1;
  if (this.start_count >= 1) {
    this.updateFilters();
    this.filter();
  }
};

TailTable.prototype.initFilters = function() {
  var that = this;

  this.filters = {
    Application: {},
    Level: {},
    columns: [],
    forColumn: function(num) {
      if (num >=0 && num < this.columns.length) {
        return this[this.columns[num]];
      }
    }
  };

  $('thead tr:first th', this.table).each(function() {
    that.filters.columns.push($(this).text());
  });

  var list = $('#level ul');
  for (var ii=Logging.levels.length-1; ii>=0; ii--) {
    list.append('<li class="selected">'+Logging.levels[ii].capitalize()+'</li>');
  }

  this.app.design.view('app_ids', {
    success: function(json) {
      if (json.rows.length === 0) { return null; }
      var list = $('#application ul');
      var ary = json.rows[0].value;
      for (ii in ary) { list.append('<li class="selected">'+ary[ii]+'</li>'); }
      that.start();
    }
  });
};


TailTable.prototype.initScrolling = function() {
  var tbody = $('tbody', this.table);

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

TailTable.prototype.initTimeFormatter = function() {
  this.time = {
    format: 'normal',
    interval_id: 0
  };
  this.toggleTimeFormat();
};

TailTable.prototype.toggleTimeFormat = function() {
  if (this.time.format === 'pretty') {
    if (this.time.interval_id !== 0) { clearInterval(this.time.interval_id); }
    this.time.interval_id = 0;
    this.time.format = 'normal';
    $('thead th.timestamp', this.table).css('width', '11.0em');
    this.prettyDate();
  } else {
    var that = this;
    this.time.format = 'pretty';
    $('thead th.timestamp', this.table).css('width', '8.0em');
    this.prettyDate();
    this.time.interval_id = setInterval(function() { that.prettyDate() }, 5000);
  }
};

TailTable.prototype.prettyDate = function( timestamp ) {
  if (arguments.length == 1) {
    if (this.time.format === 'pretty') {
      return this.app.prettyDate(timestamp);
    } else {
      return timestamp;
    }
  }

  var that = this;
  $('td[data-timestamp]').each(function() {
    var e = $(this);
    e.text(that.prettyDate(e.attr('data-timestamp')));
  });
};


TailTable.prototype.addEvents = function(json) {
  var tbody = $('tbody', this.table);
  for (var ii=json.rows.length-1; ii>=0; ii--) {
    var doc = json.rows[ii].doc;
    var timestamp = Logging.format_timestamp(doc);
    tbody.prepend(
      '<tr id="'+doc._id+'" class="color'+doc.level+'" style="display:none">'
      + '<td data-timestamp="'+timestamp+'">'+this.prettyDate(timestamp)+'</td>'
      + '<td>'+doc.app_id+'</td>'
      + '<td>'+doc.logger+'</td>'
      + '<td>'+Logging.level_name(doc.level).capitalize()+'</td>'
      + '<td>'+doc.message+'</td>'
      + '</tr>'
    );
    if (this.show(doc)) { $('tr:first', tbody).fadeIn('fast'); }
  }
  if (json.rows.length > 0) {
    var timestamp = new Date(Logging.format_timestamp(json.rows[0].doc));
    $('tfoot tr td:first-child', this.table).text("Latest: "+timestamp);
  }
};


TailTable.prototype.show = function(doc) {
  if (!this.filters.Application[doc.app_id]) { return false; }
  if (!this.filters.Level[Logging.level_name(doc.level).capitalize()]) { return false; }
  return true;
}

TailTable.prototype.updateFilters = function() {
  var filters = this.filters;
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


TailTable.prototype.filter = function() {
  var that = this;
  $('tbody tr', this.table).each(function() {
    var row = $(this);
    $('td', row).each(function(col) {
      var col_filter = that.filters.forColumn(col);
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
