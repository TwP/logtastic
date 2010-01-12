
RACK_ENV = (ENV['RACK_ENV'] || 'development').dup unless defined? RACK_ENV
RAILS_ENV = RACK_ENV

require 'erb'
require 'yaml'
require 'time'

require 'rubygems'
require 'json'
require 'mongoid'
require 'logging'

# TODO: remove these lines that muck with the load path
# we need to release/install the logging mongo_db plugin
root = File.expand_path(File.dirname(__FILE__))
$:.unshift File.join(root, %w[.. .. ruby lib])

require 'logging/plugins/mongo_db'

module Logtastic

  # :stopdoc:
  VERSION = '1.0.0'
  LIBPATH = ::File.expand_path(::File.dirname(__FILE__)) + ::File::SEPARATOR
  PATH = ::File.dirname(LIBPATH) + ::File::SEPARATOR
  # :startdoc:

  class << self

    # Configuration settings for logtastic
    attr_accessor :configuration

    # Returns the version string for the library.
    #
    def version() VERSION; end

    # Returns the library path for the module. If any arguments are given,
    # they will be joined to the end of the libray path using
    # <tt>File.join</tt>.
    #
    def libpath( *args, &block )
      rv =  args.empty? ? LIBPATH : ::File.join(LIBPATH, args.flatten)
      if block
        begin
          $LOAD_PATH.unshift LIBPATH
          rv = block.call
        ensure
          $LOAD_PATH.shift
        end
      end
      return rv
    end

    # Returns the lpath for the module. If any arguments are given,
    # they will be joined to the end of the path using
    # <tt>File.join</tt>.
    #
    def path( *args, &block )
      rv = args.empty? ? PATH : ::File.join(PATH, args.flatten)
      if block
        begin
          $LOAD_PATH.unshift PATH
          rv = block.call
        ensure
          $LOAD_PATH.shift
        end
      end
      return rv
    end

    # Set the logtastic environment string.
    #
    def env=( string )
      return if string.nil?
      RACK_ENV.replace string.to_s
    end

    # Return the logtastic environment string.
    #
    def env
      RACK_ENV
    end
  end

end  # module Logtastic

Logtastic.libpath {
  require 'logtastic/extensions/collection'
  require 'logtastic/extensions/numeric'
  require 'logtastic/extensions/string'
  require 'logtastic/extensions/time'
  require 'logtastic/initializer'
  require 'logtastic/helpers'
  require 'logtastic/bundle'
  require 'logtastic/events'
}

