
/**
 *
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
 *
 */
logging.LogEventPoller = function( app, opts ) {
  var success = opts.success;
  var interval = opts.interval;
  var running = false;
  var timeoutId = 0;
  var timestamp = null;

  /**
   *
   */
  this.running = function() {
    return running;
  };

  /**
   *
   */
  this.start = function() {
    if (running) { return this; }
    running = true;
    poll();
    return this;
  };

  /**
   *
   */
  this.stop = function() {
    if (!running) { return this; }
    running = false;
    if (timeoutId !== 0) { clearTimeout(timeoutId); }
    timeoutId = 0;
    return this;
  };

  /**
   *
   */
  function poll() {
    if (!running || timeoutId !== 0) { return null; }

    opts = {
      descending: true,
      include_docs: true,
      success: function(json) {
        if (json.rows.length > 0) {
          timestamp = json.rows[0].doc.timestamp + '~';
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
