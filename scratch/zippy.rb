
load 'init.rb'

name = 'Zippy'
Logging.logger.root.appenders = Logging.appenders.couch_db name, :auto_flushing => 25

logger = Logging.logger[name +'Logger']

messages = [
  %q(Many of life's failures are people who did not realize how close they were to success when they gave up.),
  %q(That's the way things come clear. All of a sudden. And then you realize how obvious they've been all along.),
  %q(A little inaccuracy sometimes saves tons of explanation.),
  %q(Whatever you may be sure of, be sure of this, that you are dreadfully like other people.),
  %q(I like life. It's something to do.),
  %q(My life has no purpose, no direction, no aim, no meaning, and yet I'm happy. I can't figure it out. What am I doing right?),
  %q(I don't deserve this award, but I have arthritis and I don't deserve that either.),
  %q(It is pretty hard to tell what does bring happiness; poverty and wealth have both failed.),
  %q(An economist is an expert who will know tomorrow why the things he predicted yesterday didn't happen today.),
  %q(An ounce of action is worth a ton of theory.),
  %q(Live each season as it passes; breathe the air, drink the drink, taste the fruit, and resign yourself to the influences of each.),
  %q(It is only the first step that is difficult.),
  %q(If you don't know where you are going, any road will take you there.),
  %q(I used to work in a fire hydrant factory. You couldn't park anywhere near the place.),
  %q(What the world needs is more geniuses with humility, there are so few of us left.),
  %q(The palest ink is better than the best memory.),
  %q(A torn jacket is soon mended; but hard words bruise the heart of a child.)
]

loop {
  level = [:debug, :info, :warn, :error, :fatal].at(rand(5))
  msg = messages.at(rand(messages.length))
  start = Time.now
  logger.send(level, msg)
  puts("log time: %1.6f" % (Time.now-start).to_f)
  sleep(rand*0.5)
}
