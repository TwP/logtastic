
class Logtastic::Bundle::Hourly < Mongo::Collection

  attr_reader :bundle

  def initialize( bundle )
    @bundle = bundle
    super(database, bundle.name + '.hourly')
  end

  def latest
    h = find_one({}, :fields => %w(timestamp), :sort => [['timestamp', Mongo::DESCENDING]])
    t = h ? h['timestamp'] : ''
    t.time + 1.hour
  end

  def rollup
    time = latest
    now = Time.now.utc
    return self if (now.to_i - (time.to_i + 1.hour)) < 10.minutes

    now = now.change(:hour => now.hour)
    docs = @bundle.events.hourly(time, now.change(:hour => now.hour))
    insert(docs) unless docs.empty?
    self
  end

  AVG_MAP = <<-__
    function() {
      emit({name: this.name, level: this.level}, {sum: this.value, count: 1});
    }
  __

  AVG_REDUCE = <<-__
    function( key, vals ) {
      var avg, rv = {sum: 0, count: 0};
      for (var ii=0; ii<vals.length; ii++) {
        avg = vals[ii];
        if (avg.count) {
          rv.sum   = rv.sum + avg.sum;
          rv.count = rv.count + avg.count;
        }
      }
      return rv;
    }
  __

  def average( period )
    ts = period.ago.timestamp
    query = {'timestamp' => {'$gte' => ts},
             'name'      => {'$exists' => true}}

    rows = map_reduce(AVG_MAP, AVG_REDUCE, :query => query).find()

    # TODO: preserve the map/reduce table & rebuild after rollup
    # keep the map/reduce collection around and just use whatever is cached
    # there - we only need to rebuild it after rollup
    # - how does this work with a configurable period?
    # - only valid for one hour?

    rows.map do |row|
      h = row['_id']
      h['sum'] = row['value']['sum']
      h['count'] = row['value']['count']
      h
    end
  ensure
    rows.close
  end

  COUNT = <<-__
    function() { emit({name: this.name, level: this.level}, this.value); }
  __

  DAILY = <<-__
    function() {
      var timestamp = this.timestamp.replace(/T.*/, 'T00:00:00Z');
      emit({timestamp: timestamp, name: this.name, level: this.level}, this.value);
    }
  __

  SUM = <<-__
    function( key, vals ) {
      for(var ii=0,sum=0; ii<vals.length; sum+=vals[ii++]);
      return sum;
    }
  __

  SORT = [['_id.name', Mongo::ASCENDING], ['_id.level', Mongo::ASCENDING]].freeze

  def counts( start_ts = '', end_ts = nil )
    query = _query(start_ts, end_ts)
    _normalize map_reduce(COUNT, SUM, :query => query).all(:sort => SORT)
  end

  def daily( start_ts = '', end_ts = nil )
    query = _query(start_ts, end_ts)
    _normalize map_reduce(DAILY, SUM, :query => query).all(:sort => SORT)
  end

  def _query( start_ts, end_ts )
    start_ts =
        case start_ts
        when String; start_ts
        when Time; start_ts.timestamp
        else raise ArgumentError, "Unknown timestamp given: #{start_ts.inspect}"
        end
    query = {'timestamp' => { '$gte' => start_ts }}

    end_ts =
        case end_ts
        when nil, String; end_ts
        when Time; end_ts.timestamp
        when Numeric; (start_ts.time + end_ts).timestamp
        else nil
        end
    query['timestamp']['$lt'] = end_ts if end_ts

    query['name'] = {'$exists' => true}
    return query
  end

  def _normalize( rows )
    rows.map do |row|
      h = row['_id']
      h['value'] = row['value'].to_i
      h
    end
  ensure
    rows.close
  end

end  # class Logtastic::Bundle::Hourly

