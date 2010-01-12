
require 'sinatra/base'
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

    helpers ::Logtastic::Helpers, ::ERB::Util

    before do
      @config = <<-YAML
      level_map:
        ruby:
          0: 1
          1: 2
          2: 3
          3: 4
          4: 5
      levels:
        - unknown
        - debug
        - info
        - warn
        - error
        - fatal
      YAML
      @config = YAML.parse @config
    end

    get '/' do
      @events = ::Logtastic::Events.new 'test'
      @db = ::Logtastic::Mongo::Adapter.database
      @names = @db.collection_names
      @obj = @events.find_one

      erb <<-HTML
      <div><ul>
      <% @names.each do |n| %>
        <li><%= h n %> :: <%= @db[n].count %></li>
      <% end %>
      </ul>

      <p><%= h @obj.inspect %></p>


      <% @events.hourly.each do |hash| %>
      <p><%= h hash.inspect %></p>
      <% end %>

      </div>
      HTML
    end

    get '/:bundle/?' do
      @bundle = ::Logtastic::Bundle.new params[:bundle]
      erb :overview
    end

    get '/:bundle/search/?' do
      erb "<% @title = 'Search' %><%= 'Search' %>"
    end

    get '/:bundle/tail/?' do
      erb "<% @title = 'Tail' %><%= 'Tail' %>"
    end
  end
end
