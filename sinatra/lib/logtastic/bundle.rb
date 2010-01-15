
class Logtastic::Bundle < Mongo::Collection

  ROLLUP_SCALE = 10
  DEFAULT_LEVELS = %w(debug info warn error fatal).freeze
  DEFAULT_LEVEL_MAP = {
    'ruby' => {'0'=>0, '1'=>1, '2'=>2, '3'=>3, '4'=>4}.freeze,
    'java' => {'10000'=>0, '20000'=>1, '30000'=>2, '40000'=>3, '50000'=>4}.freeze,
    'python' => {'10'=>0, '20'=>1, '30'=>2, '40'=>3, '50'=>4}.freeze
  }.freeze

  def self.create( name, size )
    names = database.collection_names
    size = Integer(size)

    unless names.include? name
      c = database.create_collection(name)
      c.insert({'_id' => 'config', 'levels' => DEFAULT_LEVELS, 'levelMap' => DEFAULT_LEVEL_MAP})
    end

    unless names.include?(name + '.events')
      database.create_collection(name + '.events', :capped => true, :size => size)
    end

    # TODO: do we _really_ need these indexes?
    unless names.include?(name + '.hourly')
      c = database.create_collection(name + '.hourly', :capped => true, :size => size / ROLLUP_SCALE)

      time = Time.now.utc - 1.hour
      time = time.change(:hour => time.hour)
      c.insert({'_id' => 'created', 'timestamp' => time.timestamp})
#      c.create_index [['timestamp', Mongo::DESCENDING]]
    end

    unless names.include?(name + '.daily')
      c = database.create_collection(name + '.daily', :capped => true, :size => size / ROLLUP_SCALE)

      time = Time.now.utc - 1.day
      time = time.change(:hour => 0)
      c.insert({'_id' => 'created', 'timestamp' => time.timestamp})
#      c.create_index [['timestamp', Mongo::DESCENDING]]
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
    index = doc['level']
    lang = level_map[doc['_lang']]
    index = lang[index] if lang

    levels.at(index.to_i) || 'unknown'
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
    events.distinct 'app_id'
  end

  def rollup
    hourly.rollup
    daily.rollup
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

