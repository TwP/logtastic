
# We will only load the CouchDB appender if we have the
# couchrest gem installed
require 'couchrest'

module Logging::Appenders

  # Accessor / Factory for the CouchDB appender.
  #
  def couch_db( *args )
    return ::Logging::Appenders::CouchDB if args.empty?
    ::Logging::Appenders::CouchDB.new(*args)
  end

  #
  #
  class CouchDB < ::Logging::Appender
    include ::Logging::Appenders::Buffering

    TIME_FMT = '%Y-%m-%dT%H:%M:%S.%%dZ'

    #
    #
    attr_accessor :app_id

    #
    #
    def initialize( name, opts = {} )
      opts = opts.merge(:layout => ::Logging::Layout.new)
      super(name, opts)

      # initialize the connection to the CouchDB instance
      uri = opts.getopt(:uri, 'http://localhost:5984')
      db_name = opts.getopt(:db_name, 'logging')
      self.app_id = opts.getopt(:app_id, name)

      @db = CouchRest.database(uri + '/' + db_name)

      configure_buffering(opts)
    end

    #
    #
    def flush
      @db.bulk_save(buffer)
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

    # call-seq:
    #    write( event )
    #
    def write( event )
      utc = Time.now.utc
      h = {
        :app_id    => @app_id,
        :timestamp => utc.strftime(TIME_FMT) % utc.usec,
        :logger    => 'Unknown',
        :level     => 0,
        :message   => nil
      }

      if event.instance_of?(::Logging::LogEvent)
        h[:logger]  = event.logger
        h[:level]   = event.level
        h[:message] = layout.format_obj(event.data)
      else
        h[:message] = event.to_s
      end
      return if h[:message].empty?

      buffer << h
      flush if buffer.length >= auto_flushing || immediate?(event)

      self
    end

  end  # class CouchDB
end  # module Logging::Appenders

# EOF
