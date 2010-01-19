
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

    if (!opts.bundle) {
        throw {
            name: 'ArgumentError',
            message: 'A bundle must be provided.'
        }
    }

    return new logtastic.EventFilters(opts.table);
};

/**
 *
 */
logtastic.EventFilters = function( opts ) {
    this._table = opts.table;
    this._bundle = opts.bundle;

    this._filters = {
        Application: {},
        Level: {},
        columns: this._table.columnNames(),
        forColumn: function(num) {
            if (num >=0 && num < this.columns.length) {
                return this[this.columns[num]];
            }
        }
    };

    var self = this, ary;

    jq('<div class="ui-widget"></div')
        .append(this._filterBox('application', this._bundle.eachAppName))
        .append(this._filterBox('level', this._bundle.eachLevel))
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


    this._table.setShow(this.prototype._show);
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

        iterFn(function(name) {
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


    _show: function( doc ) {
        if (!this._filters.Application[doc.app_id.name]) { return false; }
        if (!this._filters.Level[this._bundle.levelName(doc)]) { return false; }
        return true;
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

