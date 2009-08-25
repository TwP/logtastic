
function is_array( value ) {
  return value &&
    typeof value === 'object' &&
    typeof value.length === 'number' &&
    typeof value.splice === 'function' &&
    !(value.propertyIsEnumerable('length'));
}

function for_each( values, fn ) {
  if (is_array(values)) {
    for (ii in values) {
      for_each(values[ii], fn);
    }
  } else {
    fn(values);
  }
  return null;
}

function uniq( values ) {
  var hash = {},
      output = [];
  for_each(values, function(v) { if (v != null) { hash[v] = true; } });
  for (v in hash) {output.push(v);}
  return output;
}
