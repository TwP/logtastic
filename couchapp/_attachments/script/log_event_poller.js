
/**
 * Returns a poller that will make periodic AJAX calls to the CouchDB instance
 * and request the latest log event douments from the database. The user needs
 * to supply a <tt>success</tt> function that can be called with the returned
 * JSON documents. Optionally, the uesr can supply a polling <tt>interval</tt>
 * in milliseconds.
 *
 * @param {object} opts optional parameters
 * @returns {logging.LogEventPoller} an AJAX poller for log events
 */
logging.logEventPoller = function( opts ) {
  if (!$.isFunction(opts.success)) {
    throw {
      name: 'ArgumentError',
      message: 'A "success" callback function must be provided.'
    }
  }

  if (!opts.interval) { opts.interval = 5000; }
  return new logging.LogEventPoller(this.app, opts);
};

/**
 * Constructs a new log event poller. This constructor should not be invoked
 * directly; use {@link logging.logEventPoller} instead.
 *
 * @class Provides functionality make periodic AJAX calls to the CouchDB
 * instance and request the latest log event documents from the database.
 *
 * @extends Function
 * @param {couchdb} app the CouchDB application
 * @param {object} opts optional parameters
 * @see logging.logEventPoller
 */
logging.LogEventPoller = function( app, opts ) {
  var success = opts.success;
  var interval = opts.interval;
  var running = false;
  var timeoutId = 0;
  var timestamp = null;

  /**
   * Returns the running state of the poller. If the poller is active then
   * <tt>true</tt> is returned. If the poller is not active then <tt>false</tt>
   * is returned.
   *
   * @function
   * @returns {boolean} running state of the poller.
   */
  this.running = function() {
    return running;
  };

  /**
   * If the poller is not running, this method will start the poller. If the
   * poller is already running, this method will take no action and return.
   *
   * @function
   * @returns {logging.LogEventPoller} this.
   */
  this.start = function() {
    if (running) { return this; }
    running = true;
    poll();
    return this;
  };

  /**
   * If the poller is running, this method will stop the poller. If the poller
   * is not running, this method will take no action and return.
   *
   * @function
   * @returns {logging.LogEventPoller} this.
   */
  this.stop = function() {
    if (!running) { return this; }
    running = false;
    if (timeoutId !== 0) { clearTimeout(timeoutId); }
    timeoutId = 0;
    return this;
  };

  /** @ignore
   * Makes an AJAX request to the CoucDB instance for more log event documents.
   * When the AJAX call returns the <tt>success</tt> function is called with
   * JSON documents returend from CouchDB. If the poller is still running, then
   * this method is scheduled to be called again after <tt>interval</tt>
   * seconds have passed.
   *
   * @function
   * @returns {null} null.
   * */
  function poll() {
    if (!running || timeoutId !== 0) { return null; }

    opts = {
      descending: true,
      include_docs: true,
      success: function(json) {
        if (json.rows.length > 0) {
          //timestamp = json.rows[0].doc.timestamp + '~';
          ms = Date.parse(logging.formatTimestamp(json.rows[0].doc.timestamp));
          timestamp = (new Date(ms - 120000)).toCouchDB();
        }
        success(json);
        if (running) {
          timeoutId = setTimeout(function() { timeoutId = 0; poll(); }, interval);
        }
      }
    };

    if (timestamp) { opts.endkey = timestamp; }
    else { opts.limit = 23; }

    app.design.view('events', opts);
    return null;
  };
};
