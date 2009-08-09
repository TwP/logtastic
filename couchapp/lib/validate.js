function forbidden(message) {    
  throw({forbidden : message});
};

function unauthorized(message) {
  throw({unauthorized : message});
};

function assert(should, message) {
  if (!should) forbidden(message);
}

function isAdmin(userCtx) {
  userCtx.roles.indexOf('_admin') != -1
};

function require() {
  for (var i=0; i < arguments.length; i++) {
    var field = arguments[i];
    message = "The '"+field+"' field is required.";
    if (newDoc[field] === null ||
        newDoc[field] === undefined) {
      forbidden(message);
    }
  };
};

function unchanged(field) {
  if (oldDoc && oldDoc[field] != newDoc[field]) 
    forbidden("You may not change the '"+field+"' field.");
};

function matches(field, regex, message) {
  if (!newDoc[field].match(regex)) {
    message = message || "Format of '"+field+"' field is invalid.";
    forbidden(message);    
  }
};

// this ensures that the date will be UTC, parseable, and collate correctly
function timestampFormat(field) {
  message = "Sorry, '"+field+"' is not in a valid format. Try: 2009-07-31T14:15:42.250Z";
  matches(field, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/, message);
};
