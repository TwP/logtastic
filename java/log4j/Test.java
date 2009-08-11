
import org.apache.log4j.Logger;
import org.apache.log4j.LogManager;
import org.apache.log4j.PropertyConfigurator;

public class Test {
  private static final Logger logger = Logger.getLogger("couchdb.Test");
  public static void main( String[] args ) {
    System.out.println("Hello There");

    PropertyConfigurator.configure(args[0]);

    logger.debug("A debug message");
    logger.warn("This is your last warning");
    logger.error("Oops! How did that happen?");

    LogManager.shutdown();
  }
}
