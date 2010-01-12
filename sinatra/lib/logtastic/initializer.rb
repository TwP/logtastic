
module Logtastic

  # The Configuration class holds all the parameters for the Initializer and
  # it is configured with sensible defaults for the system. All parameters
  # are overwritable.
  #
  class Configuration

    # Name of the running program (used for log file naming).
    attr_accessor :program_name

    # Path where log files will be written.
    attr_accessor :log_path

    # The default logging level for the system.
    attr_accessor :log_level

    # An array of logging destinations.
    attr_accessor :log_to

    # Determines where the logging destinations will buffer messages or
    # flush after every log message.
    attr_accessor :log_auto_flushing

    # Location of the pid file
    attr_accessor :pid_file

    # Configuration settings for the ActiveSupport framework.
    attr_accessor :active_support

    # Sets the default +time_zone+. Setting this will enable +time_zone+
    # awareness for Active Record models and set the Active Record default
    # timezone to <tt>:utc</tt>.
    attr_accessor :time_zone

    # Array of initializers to run when the system is initialized
    attr_accessor :initializers

    # Create a new Configuration with sensible default values.
    #
    def initialize
      self.program_name      = $0.dup
      self.initializers      = %w[logging frameworks database time_zone]
      self.log_path          = ::Logtastic.path 'log'
      self.log_level         = 'info'
      self.log_to            = %w[stdout logfile]
      self.log_auto_flushing = true
      self.pid_file          = nil
      self.active_support    = ActiveSupport::OrderedOptions.new
      self.time_zone         = 'UTC'
    end

    # Path to the specific environment configuration.
    #
    def environment_path
      ::Logtastic.path 'config', 'environments', "#{RACK_ENV}.rb"
    end

    # The specific environment to load from.
    #
    def environment
      RACK_ENV
    end

    # Load the database configuration from the database YAML file in the
    # config directory.
    #
    def database_configuration
      h = YAML.load_file(::Logtastic.path('config', 'database.yml'))
      h = h[RACK_ENV] unless h.nil?
      raise RuntimeError, "No database configuration for environment #{RACK_ENV.inspect}" if h.nil?
      return h
    end

  end  # class Configuration


  # The Initializer is responsible for processing the Logtastic configuration.
  # It can be run either as a single command that will just use the default
  # configuration:
  #
  #    Logtastic::Initializer.run
  #
  # But it can also be passed a block of code to customize the
  # configuration.
  #
  #    Logtastic::Initializer.run do |config|
  #      config.log_to = %w[stdout logfile]
  #    end
  #
  class Initializer

    # The configuration instance used by the initializer.
    attr_reader :configuration

    # Runs the initializer.
    #
    def self.run( configuration = Logtastic::Configuration.new, &block )
      initializer = new configuration
      initializer.process(&block)
      initializer
    end

    # Create a new Initializer class that references the given
    # _configuration_ instance.
    #
    def initialize( configuration )
      @configuration = configuration
    end

    # Sequentially step through all of the available initialization
    # routines.
    #
    def process( &block )
      Logtastic.configuration = configuration

      load_environment
      block.call(Logtastic.configuration) unless block.nil?
      configuration.initializers.each {|init| self.send "initialize_#{init}"}
      finally
    end

    def load_environment
      path = configuration.environment_path
      return unless test(?f, path)

      config = configuration
      eval(IO.read(path), binding, path)
    end

    def finally
      configuration.pid_file ||=
          configuration.log_path / "#{configuration.program_name}.#{RACK_ENV}.pid"
    end

    def initialize_logging
      path = ::Logtastic.path('config','logging.rb')
      return unless test(?f, path)

      if configuration.log_path and !test(?e, configuration.log_path)
        FileUtils.mkdir configuration.log_path
      end

      config = configuration
      eval(IO.read(path), binding, path)
#     Logging.show_configuration
    end

    def initialize_frameworks
      configuration.active_support.each do |setting, value|
        ActiveSupport.send("#{setting}=", value)
      end
      # ActiveSupport::Inflector.inflections do |inflect|
      #   inflect.uncountable 'metadata'
      # end
    end

    def initialize_database
      settings = {
        'database' => 'logtastic',
        'host' => 'localhost',
        'port' => 27017,
        'pool' => 1,
        'timeout' => 10.0,
        'username' => nil,
        'password' => nil
      }.merge(configuration.database_configuration)
      settings.to_options!

      options = {
        :pool_size => settings[:pool],
        :timeout => settings[:timeout],
        :logger => Logging.logger[Mongo]
      }

      connection = ::Mongo::Connection.new(settings[:host], settings[:port], options)
      Mongoid.database = connection.db(settings[:database])

      if settings[:username]
        Mongoid.database.authenticate(settings[:username], settings[:password])
      end
    end

    def initialize_time_zone
      require 'active_support/time_with_zone'
      require 'tzinfo/definitions/Etc/UTC'

      if configuration.time_zone
        zone_default = Time.__send__(:get_zone, configuration.time_zone)

        unless zone_default
          raise \
            "Value assigned to config.time_zone not recognized [#{configuration.time_zone}]."
        end

        Time.zone_default = zone_default
      end
    end

  end  # class Initializer
end  # module Logtastic

# EOF
