
class Logtastic::Bundle < Mongo::Collection

  def initialize( name )
    super(self.class.database, name)
  end

  def events
    @events ||= ::Logtastic::Events.new self
  end

end  # class Logtastic::Bundle

