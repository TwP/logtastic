
module Logtastic::Extensions
module Collection

  module ClassMethods
    def database
      Mongoid.database
    end
  end

  module InstanceMethods
  end

end
end


class Mongo::Collection
  def self.inherited( other )
    other.extend Logtastic::Extensions::Collection::ClassMethods
    other.class_eval { include Logtastic::Extensions::Collection::InstanceMethods }
  end
end

