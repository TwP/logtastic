function( newDoc, oldDoc, userCtx ) {
  // !code lib/validate.js
  
  // we can always delete a log event
  if (newDoc._deleted) { return true; }

  // we cannot modify log events
  if (oldDoc && toJSON(oldDoc) !== toJSON(newDoc)) {
    forbidden('Log events cannot be modified');
  }

  // all log events must have these fields
  require('app_id', 'timestamp', 'level', 'logger', 'message');

  // we have a pretty strict time format to ensure properly ordered log messages
  timestampFormat('timestamp');

  // the log level must be a number >= 0
  assert(typeof newDoc['level'] === 'number',
         'Log event level must be a number');
  assert(newDoc['level'] >= 0,
         'Log event level must be greater than or equal to zero');
}
