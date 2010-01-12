
class Logtastic::Events < Mongo::Collection

  DAILY = <<-__
    function() {
      var timestamp = this.timestamp
          .replace(/-/g,'/')
          .replace(/T.*/, ' 00:00:00 UTC');
      emit({timestamp: timestamp, name: this.app_id.name, level: this.level, _lang: this._lang}, 1);
    }
  __

  HOURLY = <<-__
    function() {
      var timestamp = this.timestamp
          .replace(/-/g,'/')
          .replace(/T(\\d+).*/, " $1:00:00 UTC");
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

  attr_reader :bundle

  def initialize( bundle )
    @bundle = bundle
    super(database, bundle.name + '.events')
  end

  def counts( start_ts = '', end_ts = nil )
    query = _query(start_ts, end_ts)
    _normalize map_reduce(COUNT, SUM, :query => query).find()
  end

  def hourly( start_ts = '', end_ts = nil )
    query = _query(start_ts, end_ts)
    _normalize map_reduce(HOURLY, SUM, :query => query).find()
  end

  def daily( start_ts = '', end_ts = nil )
    query = _query(start_ts, end_ts)
    _normalize map_reduce(DAILY, SUM, :query => query).find()
  end

  def hourly_stats
    # grab the counts for the past hour
    counts(1.hour.ago.utc)

    # grab the hourly counts average for the past two weeks
    # - this will need to come from the counts rollup table
    # - it would be great to have a deploy flag so stats are calculated from then

    # merge the counts and averages together for name/level/lang
  end

  def daily_stats
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
      h['level'] = h['level'].integer
      h['value'] = row['value'].integer
      h
    end
  end

end  # module Logtastic::Events

