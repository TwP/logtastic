
function(doc) {
  emit(doc.timestamp, {_id: doc._id, _rev: doc._rev});
}
