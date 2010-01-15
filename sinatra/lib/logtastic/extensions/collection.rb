
module Logtastic::Extensions
module Collection

  module ClassMethods
    def database() Mongoid.database; end
  end

  module InstanceMethods
    def database() self.class.database; end

    def capped?
      options['capped'] ? true : false
    end

    def capped_size
      o = options
      o['capped'] ? o['size'] : nil
    end

    def to_capped( size )
      oh = OrderedHash.new
      oh['convertToCapped'] = @name
      oh['size'] = Integer(size)

      result = @db.command oh

      if result['ok'] == 1
        return result['retval']
      else
        raise Mongo::OperationFailure, "convertToCapped command failed: #{result['errmsg']}"
      end
    end
    alias :resize :to_capped
  end

end
end


class Mongo::Collection
  def self.inherited( other )
    other.extend Logtastic::Extensions::Collection::ClassMethods
    other.class_eval { include Logtastic::Extensions::Collection::InstanceMethods }
  end

  def all( *args, &block )
    find({}, *args, &block )
  end
end

