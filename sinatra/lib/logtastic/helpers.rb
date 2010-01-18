
module Logtastic::Helpers

  def navbar( current )
    html = %w[<ul>]
    %w[Overview Search Tail].each do |title|
      if current == title
        html << %Q(<li class="selected ui-corner-bottom">#{title}</li>)
      else
        html << "<li>#{link_to(title, :class => 'ui-corner-top')}</li>"
      end
    end
    html << '</ul>'
    html.join "\n"
  end

  def link_to( page, opts = {} )
    unless opts[:href]
      path = page == 'Overview' ? nil : page.downcase
      href = "/#{@params[:bundle]}"
      href << "/#{path}" if path
      opts[:href] = href
    end

    attrs = opts.map {|k,v|
      v = v.instance_of?(Array) ? v.join(' ') : v.to_s
      "#{k.to_s}=#{v.inspect}"
    }

    "<a #{attrs.join(' ')}>#{page}</a>"
  end

end

