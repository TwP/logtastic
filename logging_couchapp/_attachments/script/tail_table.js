var TailTable = function( app, opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table selector must be provided.'
    }
  }

  this.app = app;
  this.table = $(opts.table);

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

  tbody.append('<tr><td>&nbsp;</td></tr>');
  var row_height = $('tr', tbody).attr('clientHeight');

  tbody.css('height', 10*row_height);
  tbody.css('overflow-x', 'hidden');
  tbody.css('overflow-y', 'scroll');

  $('tr', tbody).remove();
};


TailTable.prototype.addEvents = function(json) {
  var tbody = $('tbody', this.table);
  for (var ii=json.rows.length-1; ii>=0; ii--) {
    var doc = json.rows[ii].doc;
    var timestamp = Logging.format_timestamp(doc);
    tbody.prepend(
      '<tr id="'+doc._id+'" class="color'+doc.level+'">'
      + '<td data-timestamp="'+timestamp+'">'+this.app.prettyDate(timestamp)+'</td>'
      + '<td>'+doc.app_id+'</td>'
      + '<td>'+doc.logger+'</td>'
      + '<td>'+Logging.level_name(doc.level).capitalize()+'</td>'
      + '<td>'+doc.message+'</td>'
      + '</tr>'
    );
  }
  if (json.rows.length > 0) {
    this.filter();
    var timestamp = new Date(Logging.format_timestamp(json.rows[0].doc));
    $('tfoot tr td:first-child', this.table).text("Latest: "+timestamp);
  }
};


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
