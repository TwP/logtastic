
/**
 *
 */
logging.eventInspector = function( opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table selector must be provided.'
    }
  }

  return new logging.EventInspector($(opts.table));
};

/**
 *
 */
logging.EventInspector = function( table ) {

  $('tbody', table).bind('click', function(e) {
    tr = e.target.nodeName === 'TD' ? $(e.target).parent() : $(e.target);
    logging.doc(tr.attr('id'), {success: function(json) {
      inspect(json);
    }});
  });

  var inspector = $('#inspector');
  inspector.hide();
  inspector.append(
    '<table class="logging ui-corner-all">' +
    '  <thead><tr>' +
    '    <th class="ui-corner-tl">Field</th><th>Value</th>' +
    '    <th style="text-align:right" class="ui-corner-tr"><button>Hide</button></th>' +
    '  </tr></thead>' +
    '  <tbody></tbody>' +
    '</table>'
  );
  $('th button', inspector).click(function() { inspector.slideUp('slow'); });
  var tbody = $('tbody', inspector);

  /**
   *
   */
  function inspect( doc ) {
    tbody.empty();

    var fields = []
    $.each(doc, function(key, val) { if (!key.match(/^_/)) fields.push(key); });
    fields.sort(function(a, b) { return a.toLowerCase().compare(b.toLowerCase()); });

    $.each(fields, function(ii, key) {
      $('<tr><th></th><td colspan="2"></td></tr>')
        .find('th').text(key).end()
        .find('td').append(_renderValue(key, doc[key])).end()
        .appendTo(tbody);
    });

    $('tr', tbody).filter(':even').addClass('even');
    $('tr:last-child', tbody).find('th:first-child').addClass('ui-corner-bl').end()
                             .find('td:last-child').addClass('ui-corner-br').end();

    if (inspector.css('display') === 'none') { inspector.slideDown('slow'); }
  };

  /**
   *
   */
  function _renderValue( key, val ) {
    switch (key) {
    case 'app_id':
    case 'logger':
      return $('<code class="label"></code>').text(val);

    case 'level':
      return $('<pre></pre>').html(
               '<code class="color' + logging.levelMap[val] + '">'
               + logging.levelName(val) + '</code> :: '
               + '<code class="number">' + val + '</code>'
             );

    case 'timestamp':
      ts = val.replace(/T/, ' ').replace(/Z$/, ' UTC')
      return $('<code class="label"></code>').text(ts);

    default:
      return $('<pre></pre>').html($.futon.formatJSON(val, {html: true}));
    }
  };

};
