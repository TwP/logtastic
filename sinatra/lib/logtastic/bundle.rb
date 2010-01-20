
class Logtastic::Bundle < Mongo::Collection

  ROLLUP_SCALE = 10
  DEFAULT_LEVELS = %w(debug info warn error fatal).freeze
  DEFAULT_LEVEL_MAP = {
    'ruby-0'=>0, 'ruby-1'=>1, 'ruby-2'=>2, 'ruby-3'=>3, 'ruby-4'=>4,
    'java-10000'=>0, 'java-20000'=>1, 'java-30000'=>2, 'java-40000'=>3, 'java-50000'=>4,
    'python-10'=>0, 'python-20'=>1, 'python-30'=>2, 'python-40'=>3, 'python-50'=>4
  }.freeze

  def self.create( name, size )
    names = database.collection_names
    size = Integer(size)

    unless names.include? name
      c = database.create_collection(name)
      c.insert({'_id' => 'config', 'levels' => DEFAULT_LEVELS, 'levelMap' => DEFAULT_LEVEL_MAP})
    end

    # FIXME: mongo release 1.3.1 will fix the issue with capped collections
    # and the index on the _id field -- I can remove my own indexes on that
    # field when upgrading to the next version: http://jira.mongodb.org/browse/SERVER-545
    unless names.include?(name + '.events')
      database.create_collection(name + '.events', :capped => true, :size => size)
      c.create_index [['_id', Mongo::ASCENDING]]
      c.create_index [['timestamp', Mongo::DESCENDING]]
    end

    # TODO: do we _really_ need these timestamp indexes?
    unless names.include?(name + '.hourly')
      c = database.create_collection(name + '.hourly', :capped => true, :size => size / ROLLUP_SCALE)

      time = Time.now.utc - 1.hour
      time = time.change(:hour => time.hour)
      c.insert({'_id' => 'created', 'timestamp' => time.timestamp})
      c.create_index [['timestamp', Mongo::DESCENDING]]
    end

    unless names.include?(name + '.daily')
      c = database.create_collection(name + '.daily', :capped => true, :size => size / ROLLUP_SCALE)

      time = Time.now.utc - 1.day
      time = time.change(:hour => 0)
      c.insert({'_id' => 'created', 'timestamp' => time.timestamp})
      c.create_index [['timestamp', Mongo::DESCENDING]]
    end

    return new(name)
  end

  def self.exists?( name )
    database.collections_info(name).count > 0
  end

  def initialize( name )
    unless self.class.exists? name
      raise "The bundle #{name.inspect} does not exist"
    end
    super(database, name)
  end

  def config
    @config ||= find_one({'_id' => 'config'})
  end

  def levels
    config['levels']
  end

  def level_map
    config['levelMap']
  end

  def level_name( doc )
    index = level_map[doc['level']]

    name = index ? levels.at(index) : 'unknown'
    name.capitalize
  end

  def drop_all
    hourly.drop
    daily.drop
    events.drop
    drop
    nil
  end

  def capped_size
    events.capped_size
  end

  def resize( size )
    size = Integer(size)

    events.resize size
    hourly.resize(size / ROLLUP_SCALE)
    daily.resize(size / ROLLUP_SCALE)
    self
  end
  undef :to_capped

  def events
    @events ||= ::Logtastic::Bundle::Events.new self
  end

  def hourly
    @hourly ||= ::Logtastic::Bundle::Hourly.new self
  end

  def daily
    @daily ||= ::Logtastic::Bundle::Daily.new self
  end

  def app_ids
    q = {'_id' => 'app_id_cache'}

    app_id_cache = find_one(q) || q.dup

    from = app_id_cache['from']
    to = events.last_id
    query = Hash.new {|h,k| h[k] = {}}

    query['_id']['$gt'] = from if from
    query['_id']['$lte'] = to if to

    ary = events.distinct('app_id', query)
    ary = ary + Array(app_id_cache['app_ids'])
    ary.uniq!

    app_id_cache['from'] = to
    app_id_cache['app_ids'] = ary
    update(q, app_id_cache, :upsert => true)

    ary
  end

  def rollup
    hourly.rollup
    daily.rollup
    # TODO: cache the app_ids and the summary counts here, too
    self
  end

  def summary_data
    hourly_counts = hourly.counts(25.hours.ago)
    current_counts = events.counts(hourly.latest)
    average_counts = daily.average 52.weeks

    # collate into a single object {counts: , averges: }
    {
      'counts'   => _collate(hourly_counts,current_counts) {|doc| doc['value'].to_i},
      'averages' => _collate(average_counts) {|doc| doc['sum'] / doc['count']}
    }
  end

  def _collate( *args, &block )
    h = Hash.new {|h,k| h[k] = Hash.new{|hi,ki| hi[ki] = 0}}
    args.flatten.each do |doc|
      level = level_name(doc)
      h[doc['name']][level] += block.call(doc)
    end
    h
  end

end  # class Logtastic::Bundle

