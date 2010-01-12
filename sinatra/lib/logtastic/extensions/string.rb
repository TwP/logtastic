
module Logtastic::Extensions
  module String

    TIME_RGXP = %r/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:.(\d+))?Z/

    def numeric() Integer(self) rescue Float(self) rescue nil; end
    def integer() self.numeric.to_i; end
    def float() self.numeric.to_f; end

    def seconds() self.numeric; end
    def minutes() self.numeric.minutes; end
    def hours() self.numeric.hours; end
    def days() self.numeric.days; end
    def weeks() self.numeric.weeks; end

    def time
      m = TIME_RGXP.match(self)
      return if m.nil?

      ary = m.to_a.slice(1..-1).map {|x| x.to_i}
      Time.utc(*ary)
    end

    # Join with _other_ as a file path.
    #
    #   "foo" / "bar"    #=> "foo/bar"
    #
    def /( other )
      File.join(self, other)
    rescue TypeError
      other = other.to_s
      retry
    end

  end
end

String.class_eval { include Logtastic::Extensions::String }

