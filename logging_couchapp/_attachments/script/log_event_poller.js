var LogEventPoller = function( app, opts ) {
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
  this.count = 0;
  this.timestamp = null;
};


LogEventPoller.prototype.start = function() {
  if (this.running) { return this; }
  this.running = true;
  this.poll();
  return this;
};


LogEventPoller.prototype.stop = function() {
  if (!this.running) { return this; }
  this.running = false;
  return this;
};


LogEventPoller.prototype.poll = function() {
  if (!this.running || this.count > 0) { return null; }
  this.count++;

  var that = this;
  opts = {
    descending: true,
    include_docs: true,
    success: function(json) {
      if (json.rows.length > 0) {
        that.timestamp = json.rows[0].doc.timestamp + '~';
      }
      that.success(json);
      if (that.running) {
        window.setTimeout(function() { that.count--; that.poll(); }, that.interval);
      }
    }
  };

  if (this.timestamp) { opts.endkey = this.timestamp; }
  else { opts.limit = 10; }

  this.app.design.view('events', opts);
  return null;
};
