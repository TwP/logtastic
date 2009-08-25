
function( doc ) {
  emit([doc.app_id, doc.level, doc.timestamp], doc.timestamp);
}
