
function( keys, values, rereduce ) {

  // sort the timestamps in descending order (latest comes first)
  values.sort(function(a, b) {
    return b > a ? 1 : b < a ? -1 : 0;
  });

  // we only want the latest and greatest!
  return values[0];
}
