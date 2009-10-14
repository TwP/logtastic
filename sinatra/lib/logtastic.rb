
require 'erb'
require 'yaml'
require 'json/ext'

module Logtastic
end  # module Logtastic

root = File.expand_path(File.join(File.dirname(__FILE__), 'logtastic'))
%w[helpers].each { |fn| require File.join(root, fn) }
