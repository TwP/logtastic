
load 'init.rb'

name = ARGV[0] || 'test_app:1'

couch = Logging.appenders.couch_db name, :auto_flushing => 10
Logging.logger.root.appenders = couch

logger = Logging.logger['TestLogger']

logger.info %w[this should come across as an array]
logger.warn 'This is your last warning'
logger.debug({:one => 'an example', :two => 'of passing ruby objects', :three => 'as JSON'})
logger.error 'An error has occurred'
logger.fatal 'And this is the end! I die!'

begin
  a = []
  a.slice(1,2,3,4,5)
rescue Exception => e
  logger.fatal e
end

sleep 2
