
/**
 * Returns a poller that will make periodic AJAX calls to the CouchDB instance
 * and request the latest log event douments from the database. The user needs
 * to supply a <tt>success</tt> function that can be called with the returned
 * JSON documents.
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

  return new logging.LogEventPoller(opts);
};

/**
 * Constructs a new log event poller. This constructor should not be invoked
 * directly; use {@link logging.logEventPoller} instead.
 *
 * @class Provides functionality make periodic AJAX calls to the CouchDB
 * instance and request the latest log event documents from the database.
 *
 * @extends Function
 * @param {object} opts optional parameters
 * @see logging.logEventPoller
 */
logging.LogEventPoller = function( opts ) {
  var success = opts.success;
  var interval = 5000;
  var running = false;
  var timeoutId = null;
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
    clearTimeout(timeoutId);
    timeoutId = null;
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
    if (!running || timeoutId) { return null; }

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
          timeoutId = setTimeout(function() { timeoutId = null; poll(); }, interval);
        }
      }
    };

    if (timestamp) { opts.endkey = timestamp; }
    else { opts.limit = 23; }

    logging.view('events', opts);
    return null;
  };

  var slider = function( callback ) {
    $('#sidebar').prepend(
      '<div id="interval">' +
      '  <label>Poll interval:' +
      '    <input type="range" min="1" max="30" value="5" size="3">' +
      '    <span class="secs">5</span> second(s)' +
      '  </label>' +
      '</div>'
    );

    var input = $('#interval input');
    input.val(parseInt($.cookies.get("pollinterval", "5")) || 5);

    function updateInterval( value ) {
      if (isNaN(value)) {
        value = 5;
        input.val(value);
      }
      $.cookies.set("pollinterval", value);
      callback(value);
    };

    if (input[0].type === 'range') {
      input.bind('input', function() {
        updateInterval(this.value);
        $('#interval span.secs').text(this.value);
      });
    } else {
      input.bind('change', function() {
        updateInterval(this.value);
      });
      $('#interval span.secs').hide();
    }
    updateInterval(input.val());
  };

  slider(function(value) {
    interval = parseInt(value, 10) * 1000;
    if (running) {
      clearTimeout(timeoutId);
      timeoutId = null;
      poll();
    }
  });

};
