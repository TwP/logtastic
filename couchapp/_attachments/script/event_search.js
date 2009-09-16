
/**
 *
 */
logging.eventSearch = function( opts ) {
  if (!opts.table) {
    throw {
      name: 'ArgumentError',
      message: 'A table JQuery object must be provided.'
    }
  }

  return new logging.EventSearch(opts.table);
};

/**
 *
 */
logging.EventSearch = function( table ) {

  var prev = (new Date()).toDateTime();
  var search = $('#search');
  search.append(
    '<table class="ui-wdiget"><tbody><tr>' +
    '  <td style="padding-right:0">' +
    '    <input type="text" id="searchDatepicker" name="datepicker" ' +
    '           value="' + prev + '" ' +
    '           size="15" class="ui-state-active ui-corner-all">' +
    '    </input>' +
    '  </td>' +
    '  <td style="padding-left:0.25em">UTC</td>' +
    '  <td style="padding:4px 0 4px 1em">Context:</td>' +
    '  <td style="width:30em"><div id="contextSlider"></div></td>' +
    '  <td style="padding:4px 0;white-space:nowrap">' +
    '    <span id="contextSliderTarget">5</span> minutes' + 
    '  </td>' +
    '</tr></tbody></table>'
  );

  var timestamp = $('#searchDatepicker');
  var context = $('#contextSliderTarget');

  timestamp.datepicker({
    duration: '',
    dateFormat: 'yy-mm-dd',
    showOn: 'focus',
    showTime: true,
    constrainInput: false,
    time24h: true,
    onClose: function(txt, inst) {
      timestamp.removeClass('ui-state-focus').addClass('ui-state-active');
      if (timestamp.val() !== prev) {
        _search();
      }
    }
  }).focus(function() {
    $(this).removeClass('ui-state-active').addClass('ui-state-focus');
  });

  $('#contextSlider').slider({
    range: 'min',
    value: 5,
    min: 1,
    max: 60,
    slide: function(event, ui) { context.text(ui.value); },
    stop: function(event, ui) {
      $.cookies.set('searchcontext', ui.value, null, 14);
      _search();
    }
  }).slider('value', parseInt($.cookies.get('searchcontext', '5')) || 5);
  context.text($('#contextSlider').slider('value'));

  function _search() {
    millis = Date.parse(timestamp.val().replace(/-/g,'/') + ':00 UTC');
    offset = (parseInt(context.text()) || 5) * 60 * 1000;

    var start = new Date(millis+offset).toCouchDB();
    var end   = new Date(millis-offset).toCouchDB();

    logging.view('events', {
      descending: true,
      include_docs: true,
      startkey: start,
      endkey: end,
      success: function(json) {
        if (json.rows.length > 0) {
          prev = timestamp.val();
          table.empty();
          table.addEvents(json);
        } else {
          timestamp.val(prev);
          timestamp.trigger('change');
          logging.info('No logging events were found.');
        }
      }
    });
  };

  function picker() {
    var button = logging.button({
      text: 'Older',
      icon: 'circle-arrow-s',
      iconSide: 'left',
      click: function() {
        var time = new Date(timestamp.val().replace(/-/g,'/') + ':00 UTC').toCouchDB();
        _latest(time);
      }
    });

    row = $('<tr></tr>');
    row
      .append('<td colspan="2">Find: <select class="level"></select></td>')
      .append('<td colspan="2">from <select class="appid"></select></td>')
      .append($('<td></td>').append(button));

    var levelSelect = $('td select.level', row).change(_latest);
    var appidSelect = $('td select.appid', row).change(_latest);

    $.each(logging.levels, function(ii, val) {
      $('<option></option>')
        .attr('value', ii)
        .text(logging.levelName(ii))
        .appendTo(levelSelect);
    });

    logging.eachAppId(function(name) {
      $('<option></option>')
        .attr('value', name)
        .text(name)
        .appendTo(appidSelect);
    });

    function _latest( time ) {
      time = time || (new Date).toCouchDB();

      var app_id = appidSelect.val();
      var level = logging.app_ids[app_id][levelSelect.val()];

      logging.view('latest', {
        startkey: [app_id, level],
        endkey: [app_id, level, time],
        success: function(json) {
          if (json.rows.length > 0) {
            dt = json.rows[0].value.replace(/T/,' ').replace(/:\d+\.\d+Z$/,'');
            if (dt !== prev) {
              timestamp.val(dt);
              timestamp.trigger('change');
              _search();
            }
          } else {
            logging.info('No logging events found.');
          }
        }
      });
    };

    return row;
  };

  $('tbody', search).append(picker());
  _search();
};
