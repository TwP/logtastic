var LogCountPoller = function( app, opts ) {
  // make sure we have a "success" callback function
  if (opts.success && typeof opts.success === 'function') {
    this.success = opts.success;
  } else {
    throw {
      name: 'ArgumentError',
      message: 'A "success" callback function must be provided.'
    }
  }

  // setup the poll interval
  if (opts.interval) { this.interval = opts.interval; }
  else { this.interval = 5000; }

  this.app = app;
  this.running = false;
  this.timeout_id = 0;
};


LogCountPoller.prototype.start = function() {
  if (this.running) { return this; }
  this.running = true;
  this.poll();
  return this;
};


LogCountPoller.prototype.stop = function() {
  if (!this.running) { return this; }
  this.running = false;
  if (this.timeout_id !== 0) { clearTimeout(this.timeout_id); }
  this.timeout_id = 0;
  return this;
};


LogCountPoller.prototype.poll = function() {
  if (!this.running || this.timeout_id !== 0) { return null; }

  var that = this;
  opts = {
    group_level: 2,
    success: function( json ) {
      that.success(json);
      if (that.running) {
        that.timeout_id = setTimeout(function() {that.timeout_id = 0; that.poll()}, that.interval);
      }
    }
  };

  this.app.design.view('count', opts);
  return null;
};
