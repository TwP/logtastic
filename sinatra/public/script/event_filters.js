
(function(jq) {

/**
 *
 */
logtastic.eventFilters = function( opts ) {
    if (!opts.table) {
        throw {
            name: 'ArgumentError',
            message: 'A table JQuery object must be provided.'
        }
    }
    return new logtastic.EventFilters(opts.table);
};

/**
 *
 */
logtastic.EventFilters = function( table ) {
    var self = this, ary;

    this._table = table;
    this._bundle = table.bundle;

    this._filters = {
        Application: {},
        Level: {},
        columns: table.columnNames(),
        forColumn: function(num) {
            if (num >=0 && num < this.columns.length) {
                return this[this.columns[num]];
            }
        }
    };

    jq('<div class="ui-widget"></div')
        .append(this._filterBox('application', function(callback) {self._bundle.eachAppName(callback)}))
        .append(this._filterBox('level', function(callback) {self._bundle.eachLevel(callback)}))
        .bind('click', function(e) {
            if (e.target.nodeName !== 'LI') { return; }
            jq(e.target).toggleClass('ui-state-active').toggleClass('ui-state-disabled');
            self._updateFilters();
            self._filter();
        })
        .appendTo(jq('#sidebar'));


    ary = eval(jq.cookie('filterapplication') || '[]');
    jq.each(ary, function(ii, name) {
        var selector = '#application li:contains("'+name+'")';
        jq(selector).removeClass('ui-state-active').addClass('ui-state-disabled');
    });

    ary = eval(jq.cookie('filterlevel') || '[]');
    jq.each(ary, function(ii, name) {
        var selector = '#level li:contains("'+name+'")';
        jq(selector).removeClass('ui-state-active').addClass('ui-state-disabled');
    });


    var show = function( doc ) {
        if (!self._filters.Application[doc.app_id.name]) { return false; }
        if (!self._filters.Level[self._bundle.levelName(doc)]) { return false; }
        return true;
    };

    this._table.show = show;
    this._updateFilters();
};


jq.extend(logtastic.EventFilters.prototype, {

    _filterBox: function( title, iterFn ) {
        var box = jq(
            '<div class="ui-event-filter ui-widget-content ui-corner-all">' +
            '    <div class="ui-event-filter-header ui-widget-header ui-corner-all"></div>' +
            '    <ul></ul>' +
            '</div>'
        ).attr('id', title)
        .find('div').text(title.capitalize()).end();

        iterFn(function(name, ii) {
            jq('<li class="ui-state-active ui-helper-clearfix"></li>')
                .text(name)
                .prepend('<span class="ui-icon ui-icon-circle-check"></span>')
                .appendTo(jq('ul', box[0]));
        });

        box.find('ul li:last-child').addClass('ui-corner-bottom').end()
           .find('ul li').hover(function() {jq(this).addClass('ui-state-highlight')},
                                function() {jq(this).removeClass('ui-state-highlight')});

        return box;
    },

    _updateFilters: function() {
        var ary = [], self = this;
        jq('#application ul li').each(function() {
            var li = jq(this);
            if (li.hasClass('ui-state-active')) {
                self._filters.Application[li.text()] = true;
            } else {
                self._filters.Application[li.text()] = false;
                ary.push(li.text());
            }
        });
        jq.cookie('filterapplication', JSON.stringify(ary), {path: '/' + this._bundle.name, expires: 14});

        ary.slice(0);
        jq('#level ul li').each(function() {
            var li = jq(this);
            if (li.hasClass('ui-state-active')) {
                self._filters.Level[li.text()] = true;
            } else {
                self._filters.Level[li.text()] = false;
                ary.push(li.text());
            }
        });
        jq.cookie('filterlevel', JSON.stringify(ary), {path: '/' + this._bundle.name, expires: 14});
    },

    _filter: function() {
        var self = this;
        this._table.eachRow(function() {
            tr = jq(this);
            jq('td', this).each(function(col) {
                col_filter = self._filters.forColumn(col);
                if (!col_filter) { return; }

                td = jq(this);
                if (col_filter[td.text()]) { td.removeClass('_hideme'); }
                else { td.addClass('_hideme'); }
            });

            if (jq('td._hideme', tr[0]).length > 0) { tr.hide(); }
            else { tr.show(); }
        });
    }

});

})(jQuery);

