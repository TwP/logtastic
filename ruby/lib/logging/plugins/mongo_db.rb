
root = File.expand_path(
  File.join(File.dirname(__FILE__), '..'))

module Logging::Plugins
  module MongoDB
    def initialize_mongo_db
    end
  end  # module MongoDB
end  # module Logging::Plugins

require File.join(root, 'mongo_db_layout')
require File.join(root, 'mongo_db_appender')

# EOF
