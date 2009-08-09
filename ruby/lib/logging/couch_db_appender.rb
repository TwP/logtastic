
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
    # Communication with the CouchDB instance is asynchronous; calls to the
    # appender sould return quickly. However, there will be some delay
    # before the log events appear in the CouchDB instance. The
    # communication thread must be woken up and scheduled in order for the
    # events to be posted.
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
      start_thread
    end

    # Close the appender and wait for the internal writer thread to finish.
    #
    def close( *args )
      super
      Thread.pass until @flush_thread.status == 'sleep' or !@flush_thread.status
      @flush_thread.wakeup if @flush_thread.status
      @flush_thread.join(60)
      self
    end

    # Send all buffered log events to the CouchDB instance. If the messages
    # cannot be saved the appender will be disabled, and all messages in the
    # buffer and all subsequent messages will be lost.
    #
    def flush
      return self if buffer.empty?
      @flush_events = true
      @flush_thread.wakeup if @flush_thread.status == 'sleep'
      self
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

    # This method performs the actual HTTP POST to the CouchDB instance. All
    # messages in the buffer are posted using the CouchDB bulk storage
    # semantics.
    #
    def flush_events
      return if @flush_buffer.empty?

      payload = {:docs => @flush_buffer}.to_json
      RestClient.post(@db_uri, payload)
      #JSON.parse(RestClient.post(@db_uri, payload))
      self
    rescue StandardError => err
      self.level = :off
      ::Logging.log_internal {"appender #{name.inspect} has been disabled"}
      ::Logging.log_internal(-2) {err}
      raise
    ensure
      @flush_buffer.clear
    end

    # Creats the flush thread that reads from the buffer and writes log
    # events to the CouchDB instance.
    #
    def start_thread
      @flush_buffer = []
      @flush_events = false

      @flush_thread = Thread.new(self) {
        loop {
          sleep(60) unless @flush_events or closed?

          if closed?
            sync {
              @flush_events = false
              @flush_buffer.concat @buffer
              @buffer.clear
            }
            flush_events
            break

          else
            sync {
              @flush_events = false
              @buffer, @flush_buffer = @flush_buffer, @buffer
            }
            flush_events
          end
        }  # loop
      }  # Thread.new
    end

  end  # class CouchDB
end  # module Logging::Appenders

# EOF
