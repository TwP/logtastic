
var is_array = function( value ) {
  return value &&
    typeof value === 'object' &&
    typeof value.length === 'number' &&
    typeof value.splice === 'function' &&
    !(value.propertyIsEnumerable('length'));
}

var for_each = function( values, fn ) {
  if (is_array(values)) {
    for (ii in values) {
      for_each(values[ii], fn);
    }
  } else {
    fn(values);
  }
  return null;
}

Array.prototype.contains = function( value ) {
  for (ii in this) {
    if (this[ii] === value) { return true; }
  }
  return false;
}

var uniq = function( values ) {
  var output = [];
  for_each(values, function(v) {
    if (v && typeof v === 'string') {
      if (!output.contains(v)) { output.push(v); }
    }
  });
  return output;
}
