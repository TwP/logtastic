
(function(jq) {

jq.widget('ui.barchart', {

    _init: function( ) {
        var self = this,
            o = this.options,
            context = this.element[0];

        this.element
        .addClass('ui-barchart ui-corner-all')
        .append(jq('<h2 class="ui-corner-top"></h2>').text(o.name))
        .append('<ul></ul>');

        var $bars = jq('ul', context);

        o.bundle.eachLevel( function( index, name ) {
            $bars.prepend(
                jq('<li class="color-'+index+'"></li>')
                .append(jq('<div class="label"></div>').text(name))
                .append(
                    '<div class="bar">' +
                    '  <div class="value ui-corner-right" style="width: 0%"></div>' +
                    '  <div class="average ui-corner-right" style="width: 0%"></div>' +
                    '</div>'
                )
            );
        });

        this._setData('data', o.data);
    },

    destroy: function() {
        this.element
        .removeClass('ui-barchart ui-corner-all')
        .removeData('barchart')
        .empty();
    },

    _setData: function( key, value ) {
        jq.widget.prototype._setData.apply(this, arguments);

        switch (key) {
            case 'data':
                if (value && value.counts && value.averages) this._display();
                break;
        }
    },

    _display: function( ) {
        var max = this._findMaxValue();
        if (!max) { return }

        var context = this.element[0],
            width = jq('ul li:first div.bar', context).width(),
            counts = this.options.data.counts,
            averages = this.options.data.averages;

        jq('ul li', context).each(function() {
            var name = jq('div.label', this).text(),
                c = (counts[name] || 0) * 100 / max,
                a = (averages[name] || 0) * 100 / max;

            jq('div.value',   this).width(''+c+'%');
            jq('div.average', this).width(''+a+'%');
        });
    },

    _findMaxValue: function() {
        var max = 0,
            compare = function(key, value) { max = (value > max ? value : max) };

        jq.each(this.options.data.counts, compare);
        jq.each(this.options.data.averages, compare);

        return max;
    }

});

jq.extend(jq.ui.barchart, {
    version: '1.0.0',
    defaults: {
        name: 'Application',
        bundle: null,
        data: {counts: {}, averages: {}}
    }
});

})(jQuery);

