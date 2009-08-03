
require 'rest_client'
begin
  require 'json/ext'
rescue LoadError
  require 'json'
end


module Logging::Appenders

  # Accessor / Factory for the CouchDB appender.
  #
  def couch_db( *args )
    return ::Logging::Appenders::CouchDB if args.empty?
    ::Logging::Appenders::CouchDB.new(*args)
  end

  # This class provides an Appender that sends log messages to a CouchDB
  # instance.
  #
  class CouchDB < ::Logging::Appender
    include ::Logging::Appenders::Buffering

    # The string that uniquely identifies this application in the CouchDB
    # messages.
    #
    attr_accessor :app_id

    # call-seq:
    #    CouchDB.new( name, :uri => 'http://localhost:5984',
    #                       :db_name => 'logging', :app_id => name )
    #
    # Creates a new CouchDB appender that will format log events and send
    # them to the CouchDB specified by the <tt>:uri</tt> and the
    # <tt>:db_name</tt>. Your applications should specify a unique
    # <tt>:app_id</tt> so that metrics about your application can be easily
    # generated. If an app_id is not given, then the appender <tt>name</tt>
    # is used as the app_id.
    #
    # The CouchDB appender uses message buffering. Log events are saved in
    # bulk to the CouchDB instance. You can specify the buffer size by
    # setting <tt>:auto_flushing</tt> to the number of messages to buffer.
    # Setting the auto_flushing to +true+ will cause messages to be
    # immediately sent to the CouchDB instance.
    #
    def initialize( name, opts = {} )
      opts = opts.merge(:layout => ::Logging::Layouts::CouchDB.new)
      super(name, opts)

      # initialize the connection to the CouchDB instance
      uri = opts.getopt(:uri, 'http://localhost:5984')
      db_name = opts.getopt(:db_name, 'logging')
      self.app_id = opts.getopt(:app_id, name)

      @db_uri = uri + '/' + db_name + '/_bulk_docs'

      configure_buffering(opts)
    end

    # Send all buffered log events to the CouchDB instance. If the messages
    # cannot be saved the appender will be disabled, and all messages in the
    # buffer and all subsequent messages will be lost.
    #
    def flush
      return self if buffer.empty?

      payload = {:docs => buffer}.to_json
      RestClient.post(@db_uri, payload)
      self
    rescue StandardError => err
      self.level = :off
      ::Logging.log_internal {"appender #{name.inspect} has been disabled"}
      ::Logging.log_internal(-2) {err}
      raise
    ensure
      buffer.clear
    end


    private

    # Write the given _event_ to the CouchDB instance. The message is
    # formatted into a Ruby Hash instance suitable for conversion into a
    # CouchDB JSON document.
    #
    def write( event )
      h =
        if event.instance_of?(::Logging::LogEvent)
          layout.format event
        else
          {
            :timestamp => ::Logging::Layouts::CouchDB.timestamp,
            :logger    => 'Unknown',
            :level     => 0,
            :message   => event.to_s
          }
        end
      h[:app_id] = @app_id

      buffer << h
      flush if buffer.length >= auto_flushing || immediate?(event)

      self
    end

  end  # class CouchDB
end  # module Logging::Appenders

# EOF
