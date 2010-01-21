
require 'sinatra/base'
require 'sinatra/content_for'
require 'lib/logtastic'

module Logtastic
  class Application < Sinatra::Base

    configure {
      Logtastic.env = environment
      Logtastic::Initializer.run do |config|
        config.program_name = 'logtastic'
      end
      Logging.logger[Logtastic].info "Loaded the #{RACK_ENV} environment"
    }

    enable :static
    set :root, '.'

    helpers ::Logtastic::Helpers, Sinatra::ContentFor, ERB::Util

    helpers do
      def bundle( name )
        ::Logtastic::Bundle.new(name).rollup
      rescue
        halt 404, "Sorry, #{name.inspect} was not found"
      end
    end

    # before do
    # end

    get '/' do
      erb "<p>Some intro text would be good.</p>"
    end

    get '/:bundle/?' do
      @bundle = bundle params[:bundle]
      erb :overview
    end

    get '/:bundle/search/?' do
      @bundle = bundle params[:bundle]
      erb :search
    end

    get '/:bundle/tail/?' do
      @bundle = bundle params[:bundle]
      erb :tail
    end

    get '/:bundle/config/?' do
      content_type :json

      bundle = bundle params[:bundle]
      config = bundle.config
      config['appIds'] = bundle.app_ids
      config.delete '_id'
      config['appIds'].delete '_id'

      config.to_json
    end

    get '/:bundle/summary_data/?' do
      content_type :json

      bundle = bundle params[:bundle]
      bundle.summary_data.to_json
    end

    get '/:bundle/events/?' do
      content_type :json

      query = params[:query]
      return '[]' unless query
      bundle = bundle params[:bundle]
      query = JSON.parse query
      selector = query['selector'] || {}

      if selector.has_key? '_id'
        h = selector['_id']
        h.each {|k,v| h[k] = Mongo::ObjectID.from_string(v)}
      end

      options = {}
      %w(fields skip limit sort).each { |key| options[key.to_sym] = query[key] if query.has_key? key }

      ary = bundle.events.find(selector, options).to_a
      ary.each {|doc| doc['_id'] = doc['_id'].to_s}
      ary.to_json
    end

    get '/:bundle/events/:id' do
      content_type :json

      bundle = bundle params[:bundle]
      doc = bundle.events.find_one(Mongo::ObjectID.from_string(params[:id]))
      doc.to_json
    end

    get '/:bundle/latest/?' do
      content_type :json

      query = params[:query]
      return '[]' unless query
      bundle = bundle params[:bundle]
      query = JSON.parse query

      selector = {}
      selector['app_id.name'] = query['name'] if query.key? 'name'
      selector['timestamp'] = {'$lt' => query['time']} if query.key? 'time'
      selector['level'] = {'$in' => query['levels']} if query.key? 'levels'

      options = {
        :fields => ['timestamp'],
        :sort => [['timestamp', Mongo::DESCENDING]],
      }

      doc = bundle.events.find_one(selector, options)
      doc['timestamp'].to_json
    end
  end
end

