
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
      json.level = logging.levelName(json.level)+'  ['+json.level+']';
      inspect(json);
    }});
  });

  var inspector = $('#inspector');
  inspector.hide();
  inspector.append(
    '<table class="logging">' +
    '  <thead>' +
    '    <tr><th>Field</th><th>Value</th>' +
    '    <th style="text-align:right"><button>Hide</button></th></tr>' +
    '  </thead>' +
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
    tbody.append('<tr><td>app_id</td><td colspan="2">'+doc.app_id+'</td></tr>');
    tbody.append('<tr><td>level</td><td colspan="2">'+doc.level+'</td></tr>');
    tbody.append('<tr><td>logger</td><td colspan="2">'+doc.logger+'</td></tr>');
    tbody.append('<tr><td>message</td><td colspan="2">'+doc.message+'</td></tr>');
    tbody.append('<tr><td>timestamp</td><td colspan="2">'+doc.timestamp+'</td></tr>');

    if (inspector.css('display') === 'none') { inspector.slideDown('slow'); }
  };
};
