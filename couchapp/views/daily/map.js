
function(doc) {
  var timestamp = doc.timestamp.
      replace(/-/g,'/').
      replace(/T\d+:\d+:\d+\.\d+Z$/, ' 00:00:00 UTC');

  emit([doc.app_id, timestamp, doc.level], 1);
}
