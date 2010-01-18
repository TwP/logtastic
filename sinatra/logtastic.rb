
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
      erb "<% @title = 'Search' %><%= 'Search' %>"
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

  end
end

