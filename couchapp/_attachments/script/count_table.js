
/**
 *
 */
logging.countTable = function( opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table selector must be provided.'
    }
  }
  return new logging.CountTable(this.app, $(opts.table));
};

/**
 *
 */
logging.CountTable = function( app, table ) {

  /**
   *
   */
  this.setup = function() {
    header = '<tr><th>Application</th>';
    for (ii in logging.levels) {
      header += '<th class="count ' + logging.cssColorClass(ii) + '">'
             + logging.levelName(ii) + '</th>'
    }
    header += '</tr>';
    table.find('thead').append(header);

    footer = '<tr><td colspan="' + logging.levels.length + '"></td>'
           + '<td><button class="play">Pause</button></td></tr>';
    table.find('tfoot').append(footer);

    $('button.play').click(function() {
      if (poller.running()) {
        poller.stop();
        $(this).text('Play');
      } else {
        poller.start();
        $(this).text('Pause');
      }
    });

    poller.start();
  };

  var poller = logging.logCountPoller({
    interval: 5000,
    success: function( json ) {
      for (ii in json.rows) {
        row = json.rows[ii];
        tr = findOrCreateRow(row.key[0]);
        $('td.'+logging.cssColorClass(row.key[1]), tr).text(row.value);
      }
      updated();
    }
  });

  /**
   *
   */
  function updated() {
    $('tfoot tr td:first-child', table).text('Updated: '+(new Date()));
  };

  /**
   *
   */
  function findOrCreateRow( app_id ) {
    var selector = '#' + logging.cssSelector(app_id);
    var row = $(selector);
    if (row.length == 0) {
      $('tbody.content', table).append(appIdRow(app_id));
      row = $(selector);
    }
    return row;
  };

  /**
   *
   */
  function appIdRow( app_id ) {
    var str = '<tr id="'+logging.cssSelector(app_id)+'">'
        + '<td><a href="graphs.html?app_id='+app_id+'">'+app_id+'</a></td>';
    for (ii in logging.levels) {
      str += '<td class="count '+logging.cssColorClass(ii)+'">0</td>';
    }
    str += '</tr>';
    return str;
  };
};
