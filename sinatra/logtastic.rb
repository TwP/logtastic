
require 'rubygems'
require 'sinatra/base'
require 'lib/logtastic'

module Logtastic
  class Application < Sinatra::Base

    enable :static
    set :root, '.'

    helpers ::Logtastic::Helpers

    before do
      @config = <<-YAML
      level_map:
        ruby:
          0: 0
          1: 1
          2: 2
          3: 3
          4: 4
      levels:
        - debug
        - info
        - warn
        - error
        - fatal
      YAML
      @config = YAML.parse @config
    end

    get '/' do
      erb <<-HTML
      <div class="lg-chart ui-widget"><ul>
        <li>
          <div class="label">1<div>
          <div class="bar">
            <div class="value" style="width:50%; background-color:red"></div>
          </div>
        </li>
        <li>2<div style="width:100px; background-color:blue;">&nbsp;</div></li>
      </ul></div>
      HTML
    end

    get '/:db/?' do
      erb :overview
    end

    get '/:db/search/?' do
      erb "<% @title = 'Search' %><%= 'Search' %>"
    end

    get '/:db/tail/?' do
      erb "<% @title = 'Tail' %><%= 'Tail' %>"
    end
  end
end
