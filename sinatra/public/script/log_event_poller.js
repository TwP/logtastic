
(function(jq) {

/**
 * Returns a poller that will make periodic AJAX calls to the MongoDB instance
 * and request the latest log event douments from the database. The user needs
 * to supply a <tt>success</tt> function that can be called with the returned
 * JSON documents.
 *
 * @param {object} opts optional parameters
 * @returns {logtastic.LogEventPoller} an AJAX poller for log events
 */
logtastic.logEventPoller = function( opts ) {
    if (!jq.isFunction(opts.success)) {
        throw {
            name: 'ArgumentError',
            message: 'A "success" callback function must be provided.'
        }
    }
    if (!opts.bundle) {
        throw {
            name: 'ArgumentError',
            message: 'A bundle must be provided.'
        }
    }


    return new logtastic.LogEventPoller(opts);
};

/**
 * Constructs a new log event poller. This constructor should not be invoked
 * directly; use {@link logtastic.logEventPoller} instead.
 *
 * @class Provides functionality make periodic AJAX calls to the MongoDB
 * instance and request the latest log event documents from the database.
 *
 * @extends Function
 * @param {object} opts optional parameters
 * @see logtastic.logEventPoller
 */
logtastic.LogEventPoller = function( opts ) {
    this._bundle = opts.bundle;
    this._success = opts.success;
    this._interval = 5000;
    this._running = false;
    this._timeoutId = null;
    this._lastId = null;

    var self = this,
    callback = function( value ) {
        self._interval = parseInt(value, 10) * 1000;
        if (self._running) {
            clearTimeout(self._timeoutId);
            self._timeoutId = null;
            self._poll();
        }
    };

    var div = jq('<div class="ui-poll-interval ui-widget"><div>Poll interval: <span>5</span> second(s)</div><div></div></div>'),
        secs = jq('span', div[0]);

    jq('#sidebar').prepend(div);
    jq('div:last-child', div[0]).slider({
        range: 'min',
        value: 5,
        min: 1,
        max: 30,
        slide: function(event, ui) { secs.text(ui.value); },
        stop: function(event, ui) {
            secs.text(ui.value);
            jq.cookie('pollinterval', ui.value, {path: '/' + self._bundle.name, expires: 14});
            callback(ui.value);
        }
    }).slider('value', parseInt(jq.cookie('pollinterval')) || 5);

    secs.text(jq('div:last-child', div).slider('value'));
    callback(secs.text());
};

jq.extend(logtastic.LogEventPoller.prototype, {

    /**
     * Returns the running state of the poller. If the poller is active then
     * <tt>true</tt> is returned. If the poller is not active then <tt>false</tt>
     * is returned.
     *
     * @function
     * @returns {boolean} running state of the poller.
     */
    running: function() {
        return this._running;
    },

    /**
     * If the poller is not running, this method will start the poller. If the
     * poller is already running, this method will take no action and return.
     *
     * @function
     * @returns {logging.LogEventPoller} this.
     */
    start: function() {
        if (this._running) { return this; }
        this._running = true;
        this._poll();
        return this;
    },

    /**
     * If the poller is running, this method will stop the poller. If the poller
     * is not running, this method will take no action and return.
     *
     * @function
     * @returns {logging.LogEventPoller} this.
     */
    stop: function() {
        if (!this._running) { return this; }
        this._running = false;
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
        return this;
    },

    /** @ignore
     * Makes an AJAX request to the MongoDB instance for more log event documents.
     * When the AJAX call returns the <tt>success</tt> function is called with
     * JSON documents returend from MongoDB. If the poller is still running, then
     * this method is scheduled to be called again after <tt>interval</tt>
     * seconds have passed.
     *
     * @function
     * @returns {null} null.
     * */
    _poll: function() {
        if (!this._running || this._timeoutId) { return null; }

        var self = this;
        var opts = {
            sort: ['_id', -1],
            success: function( rows ) {
                if (rows.length > 0) { self._lastId = rows[0]._id }
                self._success(rows);
                if (self._running) {
                    self._timeoutId = setTimeout(function() { self._timeoutId = null; self._poll(); }, self._interval);
                }
            }
        };

        if (this._lastId) { opts.selector = {_id: {'$gt': this._lastId}}}
        else { opts.limit = 23; }

        this._bundle.events(opts);
        return null;
    }
});

})(jQuery);

