
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

Array.prototype.uniq = function() {
  var hash = {},
      output = [];
  for_each(this, function(v) { hash[v] = true; });
  for (v in hash) {output.push(v);}
  return output;
}
