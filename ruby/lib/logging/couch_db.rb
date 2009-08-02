
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

    #
    #
    attr_accessor :app_id

    #
    #
    def initialize( name, opts = {} )
      opts = opts.merge(:layout => ::Logging::Layouts::CouchDB.new)
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

module Logging::Layouts

  # This layout will produce log output in JSON format. This is different
  # than the standard "Parseable" layout in that the JSON is tailored
  # specifically for the CouchDB appender. Differences are mainly in the
  # timestamp format and available options. The LogEvent data is only
  # formatted into JSON and not inspect format or the standard to_s format.
  #
  # The information about the log event can be configured when the layout is
  # created. Any or all of the following labels can be set as the _items_ to
  # log:
  #
  #   'logger'     Used to output the name of the logger that generated the
  #                log event.
  #   'timestamp'  Used to output the timestamp of the log event.
  #   'level'      Used to output the level of the log event.
  #   'message'    Used to output the application supplied message
  #                associated with the log event in JSON format.
  #   'file'       Used to output the file name where the logging request
  #                was issued.
  #   'line'       Used to output the line number where the logging request
  #                was issued.
  #   'method'     Used to output the method name where the logging request
  #                was issued.
  #   'pid'        Used to output the process ID of the currently running
  #                program.
  #   'thread_id'  Used to output the object ID of the thread that generated
  #                the log event.
  #   'thread'     Used to output the name of the thread that generated the
  #                log event. Name can be specified using Thread.current[:name]
  #                notation. Output empty string if name not specified. This
  #                option helps to create more human readable output for
  #                multithread application logs.
  #
  # These items are supplied to the layout as an array of strings. The items
  # 'file', 'line', and 'method' will only work if the Logger generating the
  # events is configured to generate tracing information. If this is not the
  # case these fields will always be empty.
  #
  class CouchDB < ::Logging::Layout

    # :stopdoc:
    # Arguments to sprintf keyed to directive letters
    DIRECTIVE_TABLE = {
      'logger'    => 'event.logger',
      'timestamp' => 'CouchDB.timestamp',
      'level'     => 'event.level',
      'message'   => 'format_obj(event.data)',
      'file'      => 'event.file',
      'line'      => 'event.line',
      'method'    => 'event.method',
      'pid'       => 'Process.pid',
      'thread_id' => 'Thread.current.object_id',
      'thread'    => 'Thread.current[:name]'
    }
    TIME_FMT = '%Y-%m-%dT%H:%M:%S.%%dZ'

    # call-seq:
    #    CouchDB.create_format_method( layout )
    #
    # This method will create the +format+ method in the given CouchDB
    # _layout_ based on the configured items for the layout instance.
    #
    def self.create_format_method( layout )
      code = "undef :format if method_defined? :format\n"
      code << "def format( event )\n{"

      code << layout.items.map {|name|
        "#{name.to_sym.inspect} => #{CouchDB::DIRECTIVE_TABLE[name]}"
      }.join(',')
      code << "\n}\nend"
      
      (class << layout; self end).class_eval(code, __FILE__, __LINE__)
    end
    # :startdoc:

    # call-seq:
    #    CouchDB.timestamp
    #
    # Returns a timestamp that can be sorted in CouchDB.
    #
    def self.timestamp
      utc = Time.now.utc
      utc.strftime(TIME_FMT) % utc.usec
    end

    # call-seq:
    #    CouchDB.new( opts )
    #
    # Creates a new CouchDB layout using the following options:
    #
    #    :items  => %w[timestamp level logger message]
    #
    def initialize( opts = {} )
      super
      self.items = opts.getopt(:items, %w[timestamp level logger message])
    end

    attr_reader :items

    # call-seq:
    #    layout.items = %w[timestamp level logger message]
    #
    # Set the log event items that will be formatted by this layout. These
    # items, and only these items, will appear in the log output.
    #
    def items=( ary )
      @items = Array(ary).map {|name| name.to_s.downcase}
      valid = DIRECTIVE_TABLE.keys
      @items.each do |name|
        raise ArgumentError, "unknown item - #{name.inspect}" unless valid.include? name
      end
      self.class.create_format_method(self)
    end

    # Take the given _value_ and convert it into a format suitable for use
    # in a JSON object structure.
    #
    def format_obj( value )
      case value
      when nil, Numeric, String, Array, Hash; value
      else super(value) end
    end

  end  # class CouchDB
end  # module Logging::Layouts

# EOF