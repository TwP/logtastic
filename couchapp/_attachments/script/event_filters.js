
/**
 *
 */
logging.eventFilters = function( opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table function must be provided.'
    }
  }

  return new logging.EventFilters(opts.table);
};

/**
 *
 */
logging.EventFilters = function( table ) {

  var filters = {
    Application: {},
    Level: {},
    columns: table.columnNames(),
    forColumn: function(num) {
      if (num >=0 && num < this.columns.length) {
        return this[this.columns[num]];
      }
    }
  };

  list = '<li id="application" class="menu">'
       + '<span>Application</span>'
       + '<ul>';
  logging.eachAppId(function(app_id) {
    list += '<li class="selected">'+app_id+'</li>';
  });
  list += '</ul></li>';

  list += '<li id="level" class="menu">'
        + '<span>Level</span>'
        + '<ul>';
  logging.eachLevel(function(level) {
    list += '<li class="selected">'+level+'</li>';
  });
  list += '</ul></li>';
  $('#filter').append(list);

  $('#filter').bind('click', function(e) {
    if (e.target.nodeName !== 'LI') { return; }
    $(e.target).toggleClass('selected');
    updateFilters();
    filter();
  });

  /**
   *
   */
  function show( doc ) {
    if (!filters.Application[doc.app_id]) { return false; }
    if (!filters.Level[logging.levelName(doc.level)]) { return false; }
    return true;
  };
  table.setShow(show);

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
  updateFilters();

  /**
   *
   */
  function filter() {
    table.eachRow(function() {
      tr = $(this);
      $('td', tr).each(function(col) {
        col_filter = filters.forColumn(col);
        if (!col_filter) { return; }

        td = $(this);
        if (col_filter[td.text()]) { td.removeClass('_hideme'); }
        else { td.addClass('_hideme'); }
      });

      if ($('td._hideme', tr).length > 0) { tr.hide(); }
      else { tr.show(); }
    });
  };

};
