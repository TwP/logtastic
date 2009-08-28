
/**
 *
 */
logging.eventFilters = function( opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table JQuery object must be provided.'
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

  /**
   *
   */
  function filterBox( title, iterFn ) {
    var box = $('<div class="ui-event-filter ui-widget-content ui-corner-all"><div class="ui-event-filter-header ui-widget-header ui-corner-all"></div><ul></ul></div>');
    box.attr('id', title).find('div').text(title.capitalize());

    iterFn(function(name) {
      $('<li class="ui-state-active ui-helper-clearfix"></li>')
        .text(name)
        .prepend('<span class="ui-icon ui-icon-circle-check"></span>')
        .appendTo($('ul', box));
    });

    box.find('ul li:last-child').addClass('ui-corner-bottom').end()
       .find('ul li').hover(function() {$(this).addClass('ui-state-highlight')},
                            function() {$(this).removeClass('ui-state-highlight')});

    return box;
  };

  $('<div class="ui-widget"></div')
    .append(filterBox('application', logging.eachAppId))
    .append(filterBox('level', logging.eachLevel))
    .bind('click', function(e) {
      if (e.target.nodeName !== 'LI') { return; }
      $(e.target).toggleClass('ui-state-active').toggleClass('ui-state-disabled');
      updateFilters();
      filter();
    })
    .appendTo($('#sidebar'));


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
      if (li.hasClass('ui-state-active')) { filters.Application[li.text()] = true; }
      else { filters.Application[li.text()] = false; }
    });

    $('#level ul li').each(function() {
      var li = $(this);
      if (li.hasClass('ui-state-active')) { filters.Level[li.text()] = true; }
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
