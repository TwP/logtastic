
require 'mongo'
require 'socket'

module Logging::Appenders

  # Accessor / Factory for the MongoDB appender.
  #
  def mongo_db( *args )
    return ::Logging::Appenders::MongoDB if args.empty?
    ::Logging::Appenders::MongoDB.new(*args)
  end

  # This class provides an Appender that sends log messages to a MongoDB
  # instance.
  #
  class MongoDB < ::Logging::Appender
    include ::Logging::Appenders::Buffering

    # The string that uniquely identifies this application in the MongoDB
    # messages.
    #
    attr_accessor :app_id

    # FIXME: update the initializer documentaiton

    # call-seq:
    #    MongoDB.new( name, :uri => 'http://localhost:5984',
    #                       :db_name => 'logging', :app_id => name )
    #
    # Creates a new MongoDB appender that will format log events and send
    # them to the MongoDB specified by the <tt>:uri</tt> and the
    # <tt>:db_name</tt>. Your applications should specify a unique
    # <tt>:app_id</tt> so that metrics about your application can be easily
    # generated. If an app_id is not given, then the appender <tt>name</tt>
    # is used as the app_id.
    #
    # The MongoDB appender uses message buffering. Log events are saved in
    # bulk to the MongoDB instance. You can specify the buffer size by
    # setting <tt>:auto_flushing</tt> to the number of messages to buffer.
    # Setting the auto_flushing to +true+ will cause messages to be
    # immediately sent to the MongoDB instance.
    #
    # Communication with the MongoDB instance is asynchronous; calls to the
    # appender sould return quickly. However, there will be some delay
    # before the log events appear in the MongoDB instance. The
    # communication thread must be woken up and scheduled in order for the
    # events to be posted.
    #
    def initialize( name, opts = {} )
      opts = opts.merge(:layout => ::Logging::Layouts::MongoDB.new)
      super(name, opts)

      @app_id = {
        :name => name,
        :host => opts.getopt(:host, Socket.gethostname),
        :discriminator => opts.getopt(:discriminator)
      }
      @app_id.delete :discriminator if @app_id[:discriminator].nil?

      # initialize the connection to the MongoDB instance
      db_host = opts.getopt(:db_host, 'localhost')
      db_port = opts.getopt(:db_port, Mongo::Connection::DEFAULT_PORT, :as => Integer)
      db_name = opts.getopt(:db_name, 'logtastic')

      @db = Mongo::Connection.new(db_host, db_port, :auto_reconnect => true).db(db_name)
      @collection = opts.getopt(:db_collection, 'test') + '.events'

      configure_buffering(opts)
      start_thread
    end

    # Close the appender and wait for the internal writer thread to finish.
    #
    def close( *args )
      super
      Thread.pass until @dispatcher.status == 'sleep' or !@dispatcher.status
      @dispatcher.wakeup if @dispatcher.status
      @dispatcher.join(60)
      self
    end

    # Send all buffered log events to the MongoDB instance. If the messages
    # cannot be saved the appender will be disabled, and all messages in the
    # buffer and all subsequent messages will be lost.
    #
    def flush
      return self if buffer.empty?
      @dispatch = true
      @dispatcher.wakeup if @dispatcher.status == 'sleep'
      self
    end


    private

    # Write the given _event_ to the MongoDB instance. The message is
    # formatted into a Ruby Hash instance suitable for conversion into a
    # MongoDB JSON document.
    #
    def write( event )
      h =
        if event.instance_of?(::Logging::LogEvent)
          layout.format event
        else
          {
            :timestamp => ::Logging::Layouts::MongoDB.timestamp,
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

    # This method performs the actual HTTP POST to the MongoDB instance. All
    # messages in the buffer are posted using the MongoDB bulk storage
    # semantics.
    #
    def post_events
      return if @dispatch_buffer.empty?

      @db.insert_into_db @collection, @dispatch_buffer
      self
    rescue StandardError => err
      ::Logging.log_internal(-2) {err}
      return self
    ensure
      @dispatch_buffer.clear
    end

    # Creats the dispatcher thread that reads from the buffer and writes log
    # events to the MongoDB instance.
    #
    def start_thread
      @dispatch_buffer = []
      @dispatch = false

      @dispatcher = Thread.new(self) {
        loop {
          sleep(60) unless @dispatch or closed?

          if closed?
            sync {
              @dispatch = false
              @dispatch_buffer.concat @buffer
              @buffer.clear
            }
            post_events
            break

          else
            sync {
              @dispatch = false
              @buffer, @dispatch_buffer = @dispatch_buffer, @buffer
            }
            post_events
          end
        }  # loop
      }  # Thread.new
    end

  end  # class MongoDB
end  # module Logging::Appenders

# EOF
