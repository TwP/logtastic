
class Logtastic::Bundle::Events < Mongo::Collection

  DAILY = <<-__
    function() {
      var timestamp = this.timestamp.replace(/T.*/, 'T00:00:00Z');
      emit({timestamp: timestamp, name: this.app_id.name, level: this.level, _lang: this._lang}, 1);
    }
  __

  HOURLY = <<-__
    function() {
      var timestamp = this.timestamp.replace(/T(\\d+).*/, "T$1:00:00Z");
      emit({timestamp: timestamp, name: this.app_id.name, level: this.level, _lang: this._lang}, 1);
    }
  __

  COUNT = <<-__
    function() { emit({name: this.app_id.name, level: this.level, _lang: this._lang}, 1); }
  __

  SUM = <<-__
    function( key, vals ) {
      for(var ii=0,sum=0; ii<vals.length; sum+=vals[ii++]);
      return sum;
    }
  __

  SORT = [['_id.timestamp', Mongo::ASCENDING], ['_id.name', Mongo::ASCENDING], ['_id._lang', Mongo::ASCENDING], ['_id.level', Mongo::ASCENDING]].freeze

  attr_reader :bundle

  def initialize( bundle )
    @bundle = bundle
    super(database, bundle.name + '.events')
  end

  def counts( start_ts = '', end_ts = nil )
    query = _query(start_ts, end_ts)
    _normalize map_reduce(COUNT, SUM, :query => query).all(:sort => SORT)
  end

  def hourly( start_ts = '', end_ts = nil )
    query = _query(start_ts, end_ts)
    _normalize map_reduce(HOURLY, SUM, :query => query).all(:sort => SORT)
  end

  def daily( start_ts = '', end_ts = nil )
    query = _query(start_ts, end_ts)
    _normalize map_reduce(DAILY, SUM, :query => query).all(:sort => SORT)
  end

  def latest
    cursor = find({}, :fields => %w(timestamp))
    return '' if cursor.count == 0

    doc = cursor.skip(cursor.count-1).next_document
    doc['timestamp'].time
  ensure
    cursor.close
  end
  alias :last :latest

  def last_id
    cursor = find({}, :fields => %w(_id))
    return if cursor.count == 0

    doc = cursor.skip(cursor.count-1).next_document
    doc['_id']
  ensure
    cursor.close
  end

  private

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

    return query
  end

  # TODO: normalize the level names here or client-side?
  def _normalize( rows )
    rows.map do |row|
      h = row['_id']
      h['value'] = row['value'].to_i
      h
    end
  ensure
    rows.close
  end

end  # module Logtastic::Bundle::Events

