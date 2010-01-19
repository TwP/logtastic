
(function(jq) {

/**
 *
 */
logtastic.eventTable = function( opts ) {
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

    return new logtastic.EventTable(jq(opts.table), opts.bundle);
};

/**
 *
 */
logtastic.EventTable = function( table, bundle ) {
    var self = this;
    this.table = table;
    this.bundle = bundle;
    this.tbody = jq('tbody', table[0]);
    this.time = {
        format: 'normal',
        interval_id: 0,
        head: '',
        tail: '~',

        toggleFormat: function() {
            if (this.format === 'pretty') {
                if (this.interval_id !== 0) { clearInterval(this.interval_id); }
                this.interval_id = 0;
                this.format = 'normal';
                jq('thead th.timestamp', table).css('width', '10.0em');
                self._prettyDate();
            } else {
                this.format = 'pretty';
                jq('thead th.timestamp', table).css('width', '8.0em');
                self._prettyDate();
                this.interval_id = setInterval(function() { self._prettyDate() }, 10000);
            }
        }
    };

    jq('thead button', this.table[0]).click(function() {
        var start = self.time.head === '' ? (new Date()).toMongoDB() : self.time.head;

        bundle.events({
            selector: {timestamp: {'$gt': start}},
            sort: ['timestamp', 1],
            limit: 23,
            success: function( rows ) {
                if (rows.length > 0) {
                  jq.each(rows, function(ii, row) { self.prepend(row); });
                } else {
                  logtastic.info('At the newest logging event.');
                }
            }
        });
    });

    jq('tfoot button', this.table[0]).click(function() {
        var start = self.time.tail === '~' ? (new Date()).toMongoDB() : self.time.tail;

        bundle.events({
            selector: {timestamp: {'$lt': start}},
            sort: ['timestamp', -1],
            limit: 23,
            success: function( rows ) {
                if (rows.length > 0) {
                  jq.each(rows, function(ii, row) { self.append(row); });
                } else {
                  logtastic.info('At the oldest logging event.');
                }
            }
        });
    });
};

jq.extend(logtastic.EventTable.prototype, {
    /**
     *
     */
    setup: function() {
        var self = this;
        this.time.toggleFormat();
        this._initScrolling();

        jq('thead th.timestamp', this.table[0]).click(function() { self.time.toggleFormat(); });
        jq(window).resize(function() { self._initScrolling(); });
    },

    columnNames: function() {
        ary = []
        jq('thead tr:first th', table).each(function() {
            ary.push(jq(this).text());
        });
        return ary;
    },

    prepend: function( doc ) {
        if (document.getElementById(doc._id)) { return; }
        this.tbody.prepend(this._row(doc));
        this._showRow(doc);
        this.time.head = doc.timestamp;
    },

    append: function( doc ) {
        if (document.getElementById(doc._id)) { return; }
        this.tbody.append(this._row(doc));
        this._showRow(doc);
        this.time.tail = doc.timestamp;
    },

    insert: function( doc ) {
        if (document.getElementById(doc._id)) { return; }

        // initialization case (no rows have yet been added)
        if (this.time.head === '') {
            this.prepend(doc);
            this.time.head = this.time.tail = doc.timestamp;
            return;
        };

        // prepend the document if timestamp is greater than our head
        if (doc.timestamp.compare(this.time.head) >= 0) {
            this.prepend(doc);
            return;
        };

        // append the document if timestamp is less than our tail
        if (doc.timestamp.compare(this.time.tail) < 0) {
            this.append(doc);
            return;
        };

        var self = this;
        // otherwise we need to search through all rows for the insert location
        jq('tr', this.tbody[0]).each(function() {
            tr = jq(this);
            ts = tr.attr('data-sortby');
            if (doc.timestamp.compare(ts) >= 0) {
                tr.before(self._row(doc));
                self._showRow(doc);
                return false;  // break out of the each loop
            }
        });
    },

    /**
     *
     */
    empty: function() {
        this.tbody.empty();
        this.time.head = '';
        this.time.tail = '~';
    },

    /**
     *
     */
    eachRow: function( callback ) {
        jq('tr', this.tbody[0]).each(callback);
    },

    /**
     *
     */
    addEvents: function( rows ) {
      for (var ii=rows.length-1; ii>=0; ii--) {
        this.insert(rows[ii]);
      }
      var timestamp = new Date(logtastic.formatTimestamp(this.time.head));
      jq('tfoot tr td:first-child', this.table).text("Latest: "+timestamp);
    },

    /**
     *
     */
    _initScrolling: function() {
        var row_height = 0,
            context = this.tbody[0];

        if (jq('tr:first-child', context).length > 0) {
            row_height = jq('tr:first-child', context).attr('clientHeight');
        } else {
            this.tbody.append('<tr><td>&nbsp;</td></tr>');
            row_height = jq('tr', context).attr('clientHeight');
            jq('tr', context).remove();
        }

        row_count = Math.floor(jq(window).height() / row_height) - 6;

        this.tbody.css({
            'height': row_count*row_height,
            'overflow-x': 'hidden',
            'overflow-y': 'scroll'
        });
    },

    /**
     *
     */
    _prettyDate: function( timestamp ) {
        if (arguments.length == 1) {
            if (this.time.format === 'pretty') {
                return logtastic.prettyDate(timestamp);
            } else {
                return timestamp.replace(/\//g, '-').replace(/ UTC$/, '');
            }
        }

        var self = this;
        jq('td[data-timestamp]', this.tbody[0]).each(function() {
            e = jq(this);
            e.text(self._prettyDate(e.attr('data-timestamp')));
        });
    },

    /**
     *
     */
    _row: function( doc ) {
        timestamp = logtastic.formatTimestamp(doc);
        return '<tr id="'+doc._id+'" class="'+this.bundle.cssColorClass(doc)+'" style="display:none" data-sortby="'+doc.timestamp+'">'
            + '<td data-timestamp="'+timestamp+'">'+this._prettyDate(timestamp)+'</td>'
            + '<td>'+doc.app_id.name+'</td>'
            + '<td>'+doc.logger+'</td>'
            + '<td>'+this.bundle.levelName(doc)+'</td>'
            + '<td colspan="2"></td>'
            + '</tr>'
    },

    /**
     *
     */
    _showRow: function( doc ) {
        msg = typeof doc.message === 'string' ?
              doc.message : JSON.stringify(doc.message);

        r = jq('#'+doc._id);
        jq('td:last-child', r[0]).text(msg);
        if (this.show(doc)) { r.fadeIn('fast'); }
    },

    show: function( doc ) { return true; }
});


})(jQuery);

