
(function(jq) {

/**
 *
 */
logtastic.eventSearch = function( opts ) {
    if (!opts.table) {
        throw {
            name: 'ArgumentError',
            message: 'A table JQuery object must be provided.'
        }
    }

    return new logtastic.EventSearch(opts.table);
};

/**
 *
 */
logtastic.EventSearch = function( table ) {

    var bundle = table.bundle,
        prev = (new Date()).toDateTime(),
        search = jq('#search');

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

    var timestamp = jq('#searchDatepicker');
    var context = jq('#contextSliderTarget');

    timestamp.datepicker({
        duration: '',
        dateFormat: 'yy-mm-dd',
        showOn: 'focus',
        showTime: true,
        constrainInput: false,
        time24h: true,
        onClose: function(txt, inst) {
            timestamp.removeClass('ui-state-focus').addClass('ui-state-active');
            if (timestamp.val() !== prev) { _search() }
        }
    }).focus(function() {
        jq(this).removeClass('ui-state-active').addClass('ui-state-focus');
    });

    jq('#contextSlider').slider({
        range: 'min',
        value: 5,
        min: 1,
        max: 60,
        slide: function(event, ui) { context.text(ui.value); },
        stop: function(event, ui) {
            jq.cookie('searchcontext', ui.value, {path: '/' + bundle.name, expires: 14});
            _search();
        }
    }).slider('value', parseInt(jq.cookie('searchcontext')) || 5);
    context.text(jq('#contextSlider').slider('value'));

    function _search() {
        millis = Date.parse(timestamp.val().replace(/-/g,'/') + ':00 UTC');
        offset = (parseInt(context.text()) || 5) * 60 * 1000;

        var start = new Date(millis+offset).toMongoDB();
        var end   = new Date(millis-offset).toMongoDB();

        bundle.events({
            selector: {
                timestamp: {'$lt': start, '$gt': end}
            },
            sort: [['timestamp', -1]],
            success: function( docs ) {
                if (docs.length > 0) {
                    prev = timestamp.val();
                    table.empty();
                    table.addEvents(docs);
                } else {
                    timestamp.val(prev);
                    timestamp.trigger('change');
                    logtastic.info('No logging events were found.');
                }
            }
        });
    };

    function picker() {
        var button = logtastic.button({
            text: 'Older',
            icon: 'circle-arrow-s',
            iconSide: 'left',
            click: function() {
                var time = new Date(timestamp.val().replace(/-/g,'/') + ':00 UTC').toMongoDB();
                _latest(time);
            }
        });

        var row = jq('<tr></tr>')
            .append('<td colspan="2">Find: <select class="level"></select></td>')
            .append('<td colspan="2">from <select class="appid"></select></td>')
            .append(jq('<td></td>').append(button));

        var levelSelect = jq('td select.level', row).change(_latest);
        var appSelect = jq('td select.appid', row).change(_latest);

        bundle.eachLevel(function(val, ii) {
            jq('<option></option>')
            .attr('value', ii)
            .text(val)
            .appendTo(levelSelect);
        });

        bundle.eachAppName(function(name) {
            jq('<option></option>')
            .attr('value', name)
            .text(name)
            .appendTo(appSelect);
        });

        function _latest( time ) {
            time = typeof(time) === 'string' ? time : (new Date).toMongoDB();

            var appName = appSelect.val(),
                levels = bundle.reverseLevelMap[levelSelect.val()];

            bundle.latest({
                name: appName,
                time: time,
                levels: levels,
                success: function(dt) {
                    if (dt) {
                        dt = dt.replace(/T/,' ').replace(/:\d+\.\d+Z$/,'');
                        if (dt !== prev) {
                            timestamp.val(dt);
                            timestamp.trigger('change');
                            _search();
                        }
                    } else {
                        logtastic.info('No logging events found.');
                    }
                }
            });
        };

        return row;
    };

    jq('tbody', search[0]).append(picker());
    _search();
};

})(jQuery);

