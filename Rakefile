# Look in the tasks/setup.rb file for the various options that can be
# configured in this Rakefile. The .rake files in the tasks directory
# are where the options are used.

begin
  require 'bones'
  Bones.setup
rescue LoadError
  begin
    load 'tasks/setup.rb'
  rescue LoadError
    raise RuntimeError, '### please install the "bones" gem ###'
  end
end

ensure_in_path 'lib'
require 'logging'
require 'logging/plugins/couch_db'

task :default => 'spec:specdoc'

PROJ.name = 'logging-couchdb'
PROJ.authors = 'Tim Pease'
PROJ.email = 'tim.pease@gmail.com'
PROJ.url = 'http://logging.rubyforge.org/logging-couchdb'
PROJ.version = '1.0.0'
PROJ.rubyforge.name = 'logging'
PROJ.exclude << 'logging-couchdb.gemspec'
PROJ.readme_file = 'README.rdoc'
PROJ.ignore_file = '.gitignore'
PROJ.rdoc.remote_dir = 'logging-couchdb'

PROJ.spec.opts << '--color'

PROJ.ann.email[:server] = 'smtp.gmail.com'
PROJ.ann.email[:port] = 587
PROJ.ann.email[:from] = 'Tim Pease'

depend_on 'logging'
depend_on 'couchrest'
depend_on 'rspec'

# EOF
