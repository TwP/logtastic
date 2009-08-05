
/**
 *
 */
logging.logCountPoller = function( opts ) {
  if (!$.isFunction(opts.success)) {
    throw {
      name: 'ArgumentError',
      message: 'A "success" callback function must be provided.'
    }
  }

  if (!opts.interval) { opts.interval = 5000; }
  return new logging.LogCountPoller(this.app, opts);
};

/**
 *
 */
logging.LogCountPoller = function( app, opts ) {
  var success = opts.success;
  var interval = opts.interval;
  var running = false;
  var timeoutId = 0;

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
    if (timeoutId != 0) { clearTimeout(timeoutId); }
    timeoutId = 0;
    return this;
  };

  /**
   *
   */
  function poll() {
    if (!running || timeoutId !== 0) { return null; }

    opts = {
      group_level: 2,
      success: function( json ) {
        success(json);
        if (running) {
          timeoutId = setTimeout(function() {timeoutId = 0; poll()}, interval);
        }
      }
    };

    app.design.view('count', opts);
    return null;
  };
};
