
/**
 * Returns a poller that will make periodic AJAX calls to the CouchDB instance
 * and request the latest log event counts from the database. The user needs
 * to supply a <tt>success</tt> function that can be called with the returned
 * JSON documents. Optionally, the uesr can supply a polling <tt>interval</tt>
 * in milliseconds.
 *
 * @param {object} opts optional parameters
 * @returns {logging.LogCountPoller} an AJAX poller for log counts
 */
logging.logCountPoller = function( opts ) {
  if (!$.isFunction(opts.success)) {
    throw {
      name: 'ArgumentError',
      message: 'A "success" callback function must be provided.'
    }
  }

  return new logging.LogCountPoller(opts);
};

/**
 * Constructs a new log count poller. This constructor should not be invoked
 * directly; use {@link logging.logCountPoller} instead.
 *
 * @class Provides functionality make periodic AJAX calls to the CouchDB
 * instance and request the latest log event counts from the database.
 *
 * @extends Function
 * @param {object} opts optional parameters
 * @see logging.logCountPoller
 */
logging.LogCountPoller = function( opts ) {
  var success = opts.success;
  var interval = 5000;
  var running = false;
  var timeoutId = null;

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
   * Makes an AJAX request to the CoucDB instance for the total log counts.
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
      group_level: 2,
      success: function( json ) {
        success(json);
        if (running) {
          timeoutId = setTimeout(function() {timeoutId = null; poll()}, interval);
        }
      }
    };

    logging.view('count', opts);
    return null;
  };

  var slider = function( callback ) {

    var div = $('<div class="ui-poll-interval ui-widget"><div>Poll interval: <span>5</span> second(s)</div><div></div></div>');
    $('#sidebar').prepend(div);

    var secs = $('span', div);
    
    $('div:last-child', div).slider({
      range: 'min',
      value: 5,
      min: 1,
      max: 30,
      slide: function(event, ui) { secs.text(ui.value); },
      stop: function(event, ui) {
        secs.text(ui.value);
        $.cookies.set("pollinterval", ui.value, null, 14);
        callback(ui.value);
      }
    }).slider('value', parseInt($.cookies.get("pollinterval", "5")) || 5);

    secs.text($('div:last-child', div).slider('value'));
    callback(secs.text());
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
