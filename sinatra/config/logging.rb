
pattern = '[%d] %-5l %c : %m\n'
Logging.format_as :inspect

if config.log_to.include? 'stdout'
  Logging.appenders.stdout(
    'stdout',
    :auto_flushing => true,
    :layout => Logging.layouts.pattern(:pattern => pattern)
  )
end

if config.log_to.include? 'logfile'
  Logging.appenders.rolling_file(
    'logfile',
    :filename => config.log_path/"#{config.program_name}.#{config.environment}.log",
    :keep => 7,
    :age => 'daily',
    :truncate => false,
    :auto_flushing => config.log_auto_flushing,
    :layout => Logging.layouts.pattern(:pattern => pattern)
  )
end

Logging.logger.root.level = config.log_level
Logging.logger.root.appenders = config.log_to

#Logging.logger['Mongo'].level = :debug

# EOF
