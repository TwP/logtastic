
require 'rubygems'
$:.unshift 'ruby/lib'

require 'logging'
Logging.plugin_names.clear
Logging.plugin :none
Logging.init

require 'logging/plugins/couch_db'

root = Logging.logger.root
root.level = :all
