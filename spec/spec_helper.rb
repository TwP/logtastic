
require 'rubygems'
require 'logging'

Logging.plugin.clear
Logging.plugin << :none
Logging.init

require File.expand_path(
    File.join(File.dirname(__FILE__), %w[.. lib logging plugins couch_db]))

Spec::Runner.configure do |config|
  # == Mock Framework
  #
  # RSpec uses it's own mocking framework by default. If you prefer to
  # use mocha, flexmock or RR, uncomment the appropriate line:
  #
  # config.mock_with :mocha
  # config.mock_with :flexmock
  # config.mock_with :rr
end

# EOF
