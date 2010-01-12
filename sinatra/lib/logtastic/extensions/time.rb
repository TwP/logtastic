
module Logtastic::Extensions
  module Time
    def timestamp() ::Logging::Layouts::MongoDB.timestamp self; end
  end
end

Time.class_eval { include Logtastic::Extensions::Time }

