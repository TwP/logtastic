
function(doc) {
  var timestamp = doc.timestamp.
      replace(/-/g,'/').
      replace(/T/, ' ').
      replace(/:\d+:\d+\.\d+Z$/, ':00:00 UTC');

  emit([timestamp, doc.app_id, doc.level], 1);
}
