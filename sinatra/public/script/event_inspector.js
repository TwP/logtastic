
(function(jq) {

/**
 *
 */
logtastic.eventInspector = function( opts ) {
    if (!opts.table) {
        throw {
            name: 'ArgumentError',
            message: 'A table selector must be provided.'
        }
    }

    if (!opts.bundle) {
        throw {
            name: 'ArgumentError',
            message: 'A bundle must be provided.'
        }
    }

    return new logtastic.EventInspector(jq(opts.table), opts.bundle);
};

/**
 *
 */
logtastic.EventInspector = function( table, bundle ) {

    jq('tbody', table[0]).bind('click', function(e) {
        tr = e.target.nodeName === 'TD' ? jq(e.target).parent() : jq(e.target);
        bundle.getEvent(tr.attr('id'), function(doc) { inspect(doc) });
    });

    var inspector = jq('#inspector');
    inspector.hide();
    inspector.append(
        '<table class="logtastic ui-corner-all">' +
        '    <thead><tr>' +
        '       <th class="ui-corner-tl">Field</th><th>Value</th>' +
        '       <th style="text-align:right" class="ui-corner-tr"><button>Hide</button></th>' +
        '    </tr></thead>' +
        '    <tbody></tbody>' +
        '</table>'
    );
    jq('th button', inspector[0]).click(function() { inspector.slideUp('slow'); });
    var tbody = jq('tbody', inspector[0]);

    /**
     *
     */
    function inspect( doc ) {
        tbody.empty();

        var fields = [];
        jq.each(doc, function(key, val) { if (!key.match(/^(_|app_id)/)) fields.push(key); });
        fields.sort(function(a, b) { return a.toLowerCase().compare(b.toLowerCase()); });

        jq.each(['name', 'host'], function(ii, key) {
            jq('<tr><th></th><td colspan="2"></td></tr>')
            .find('th').text(key).end()
            .find('td').append(_renderValue(key, doc.app_id[key])).end()
            .appendTo(tbody);
        });

        jq.each(fields, function(ii, key) {
            jq('<tr><th></th><td colspan="2"></td></tr>')
            .find('th').text(key).end()
            .find('td').append(_renderValue(key, doc[key])).end()
            .appendTo(tbody);
        });

        jq('tr', tbody[0]).filter(':even').addClass('even');
        jq('tr:last-child', tbody[0])
        .find('th:first-child').addClass('ui-corner-bl').end()
        .find('td:last-child').addClass('ui-corner-br').end();

        if (inspector.css('display') === 'none') { inspector.slideDown('slow'); }
    };

    /**
     *
     */
    function _renderValue( key, val ) {
        switch (key) {
        case 'name':
        case 'host':
        case 'logger':
            return jq('<code class="label"></code>').text(val);

        case 'level':
            return jq('<pre></pre>').html(
                   '<code class="color' + bundle.levelMap['ruby'][val] + '">'
                   + bundle.levelName({'_lang': 'ruby', level: val}) + '</code> :: '
                   + '<code class="number">' + val + '</code>');

        case 'timestamp':
            ts = val.replace(/T/, ' ').replace(/Z$/, ' UTC')
            return jq('<code class="label"></code>').text(ts);

        default:
            return jq('<pre></pre>').html(jq.futon.formatJSON(val, {html: true}));
        }
    };

};

})(jQuery);

