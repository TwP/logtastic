
root = File.expand_path(
  File.join(File.dirname(__FILE__), '..'))

module Logging::Plugins
  module CouchDB
    def initialize_couch_db
    end
  end  # module CouchDB
end  # module Logging::Plugins

require File.join(root, 'couch_db_layout')
require File.join(root, 'couch_db_appender')

# EOF
