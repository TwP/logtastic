
package com.pea53.log4j.couchdb;

import java.lang.reflect.Field;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.LogManager;
import org.apache.log4j.Hierarchy;
import org.apache.log4j.helpers.LogLog;
import org.apache.log4j.spi.LoggingEvent;

import org.svenson.JSON;
import org.svenson.JSONProperty;
import org.svenson.JSONTypeHint;

import org.jcouchdb.db.Database;
import org.jcouchdb.document.Attachment;
import org.jcouchdb.document.Document;
import org.jcouchdb.exception.CouchDBException;


/**
 * Sends {@link org.apache.log4j.spi.LoggingEvent} objects to a CouchDB server.
 *
 * This appender does not use a layout. Logging events are formatted as JSON
 * documents and then dispatched to the CouchDB server. See the {@link
 * LoggingEventDocument} for information on which information from logging
 * events are stored in the CouchDB server.
 *
 * Events are dispatched asynchronously. The events are stored as JSON
 * documents in a buffer. An internal thread empties the buffer and dispatches
 * the JSON documents to the CouchDB server in bulk. Logging performance is
 * minimally affected. However, some messages can be lost if care is not taken
 * to close this appender before application exit.
 *
 * To avoid lost data, it is usually sufficient to {@link
 * #close} the <code>CouchDBAppender</code> either explicitly or by
 * calling the {@link org.apache.log4j.LogManager#shutdown} method
 * before exiting the application.
 *
 * The CouchDBAppender has the following properties:
 *
 * <em>Host</em>: This is the host where the CoucDB server is running.
 *
 * <em>Port</em>: The port number where CouchDB is accepting connections.
 *
 * <em>Database</em>: The database name where logging events will be posted.
 *
 * <em>Application</em>: A unique String identifying the particular
 * appcliation. This identifer is used in the logging CouchApp for filter log
 * messages particular to this application. A convenient naming convention is
 * something like "ApplicationName:HostName:PortNumber(or unique ID number)".
 *
 * <em>BufferSize</em>: Logging events are buffered and then sent in bulk to
 * CouchDB. If the number of events in the buffer reaches the BufferSize, then
 * the events are dispatched. Regardless of the number of events in the buffer,
 * an attempt is made to dispatch events once every minute. If there are no
 * events in the buffer then no action is taken.
 *
 * <em>LocationInfo</em>: When set to <em>true</em> location information about
 * the logging event will be included in the document sent to CouchDB. This
 * information includes the class, file, line, and method.
 *
 * @author  Tim Pease
 * @since   0.1.0
 */
public class CouchDBAppender extends AppenderSkeleton {

  public static final String DEFAULT_HOST        = "localhost";
  public static final int    DEFAULT_PORT        = 5984;
  public static final String DEFAULT_DATABASE    = "logging";
  public static final int    DEFAULT_BUFFER_SIZE = 128;

  String host;
  int port;
  String database;
  String application;
  boolean locationInfo;
  int bufferSize;

  private Database db;
  private SimpleDateFormat isoDateFormat;
  private final ArrayList<LoggingEventDocument> buffer;
  private final Thread dispatcher;
  private static int discriminator = 0;

  synchronized private static int getDiscriminator() {
    discriminator = (discriminator + 1) % 1000;
    return discriminator;
  }

  /**
   * Connects to the CouchDB server at the default host and port.
   */
  public CouchDBAppender() {
    this(DEFAULT_HOST, DEFAULT_PORT, DEFAULT_DATABASE);
  }

  /**
   * Connects to the CouchDB server at <code>host</code> using the default
   * port.
   */
  public CouchDBAppender( String host ) {
    this(host, DEFAULT_PORT, DEFAULT_DATABASE);
  }

  /**
   * Connects to the CouchDB server at <code>host</code> and
   * <code>port</code>.
   */
  public CouchDBAppender( String host, int port ) {
    this(host, port, DEFAULT_DATABASE);
  }

  /**
   *
   */
  public CouchDBAppender( String host, int port, String database ) {
    this.host = host;
    this.port = port;
    this.database = database;

    application = null;
    locationInfo = false;
    buffer = new ArrayList<LoggingEventDocument>();
    bufferSize = DEFAULT_BUFFER_SIZE;

    isoDateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'%03dZ'");
    isoDateFormat.setTimeZone(TimeZone.getTimeZone("Etc/UTC"));

    dispatcher = new Thread(new Dispatcher(this, buffer));
    dispatcher.setDaemon(true);
    dispatcher.setName("Dispatcher-" + dispatcher.getName());
    dispatcher.start();
  }

  /**
   * Connect to the specified CouchDB server and database.
   */
  public void activateOptions() {
    db = new Database(host, port, database);
  }

  /**
   * Close this appender.
   *
   * <p>This will mark the appender as closed and then call {@link
   * #cleanUp} method.
   */
  public void close() {
    if (closed) { return; }

    synchronized (buffer) {
      closed = true;

      try {
        db.bulkCreateDocuments(buffer);
      } catch (CouchDBException ex) {
        LogLog.error(
          "Could not send logging events to CouchDB at 'http://"
          + host + ":" + port + "/" + database + "'", ex);
      }

      buffer.clear();
      buffer.notifyAll();
    }

    try {
      dispatcher.join();
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      LogLog.error(
        "Got an InterruptedException while waiting for the "
        + "dispatcher to finish.", ex);
    }
  }

  /**
   * Append the logging event to the internal buffer for later dispatch to the
   * CouchDB server.
   */
  public void append( LoggingEvent event ) {
    Date date = new Date(event.timeStamp);

    // Set the NDC, MDC and thread name for the calling thread as these
    // LoggingEvent fields were not set at event creation time.
    event.getNDC();
    event.getMDCCopy();
    event.getThreadName();

    if (locationInfo) {
      event.getLocationInformation();
    }

    LoggingEventDocument doc = new LoggingEventDocument(event);
    doc.setTimeStamp(String.format(
      isoDateFormat.format(date), CouchDBAppender.getDiscriminator()
    ));

    synchronized (buffer) {
      buffer.add(doc);
      if (buffer.size() >= bufferSize) {
        buffer.notifyAll();
      }
    }
  }

  /**
   * The CouchDBAppender does not use a layout. Hence, this method
   * returns <code>false</code>.
   */
  public boolean requiresLayout() {
    return false;
  }

  /**
   * The <b>Host</b> option takes a string value which should be
   * the host name of the server where a CouchDB server is
   * running.
   */
  public void setHost(String host) {
    this.host = host;
  }

  /**
   * Returns value of the <b>Host</b> option.
   */
  public String getHost() {
    return host;
  }

  /**
   * The <b>Port</b> option takes a positive integer representing
   * the port where the CouchDB server is waiting for connections.
   */
  public void setPort(int port) {
    this.port = port;
  }

  /**
   * Returns value of the <b>Port</b> option.
   */
  public int getPort() {
    return port;
  }

  /**
   * The <b>Database</b> option takes a string value which should be
   * the name of the CouchDB database to send log events to.
   */
  public void setDatabase(String database) {
    this.database = database;
  }

  /**
   * Returns value of the <b>Database</b> option.
   */
  public String getDatabase() {
    return database;
  }

  /**
   * The <b>Application</b> option takes a string value which should be the
   * name of the application getting logged.
   * If property was already set (via system property), don't set here.
   */
  public void setApplication(String lapp) {
    this.application = lapp;
  }

  /**
   *  Returns value of the <b>Application</b> option.
   */
  public String getApplication() {
    return application;
  }

  /**
   * The <b>LocationInfo</b> option takes a boolean value. If true,
   * the information sent to the CouchDB server will include location
   * information. By default no location information is sent.
   */
  public void setLocationInfo(boolean locationInfo) {
    this.locationInfo = locationInfo;
  }

  /**
   * Returns value of the <b>LocationInfo</b> option.
   */
  public boolean getLocationInfo() {
    return locationInfo;
  }

  /**
   * Sets the number of messages allowed in the event buffer
   * before the dispatch thread is executed. Changing the size
   * will not affect messages already in the buffer.
   *
   * @param size buffer size, must be positive.
   */
  public void setBufferSize( int size ) {
    if (size < 0) {
      throw new java.lang.NegativeArraySizeException("size");
    }

    synchronized (buffer) {
      this.bufferSize = (size < 1) ? 1 : size;
      buffer.notifyAll();
    }
  }

  /**
   * Gets the current buffer size.
   * @return the current value of the <b>BufferSize</b> option.
   */
  public int getBufferSize() {
    return bufferSize;
  }

  /**
   * This class maps a {@link LoggingEvent} instance to a JSON document
   * suitable for dispatch to the CouchDB server.
   *
   * @author Tim Pease
   * @since 0.1.0
   */
  public class LoggingEventDocument implements Document {
    private String id;
    private String revision;
    private String timestamp;
    private LoggingEvent event;

    public LoggingEventDocument() {}
    public LoggingEventDocument( LoggingEvent event ) { this.event = event; }

    @JSONProperty(value = "_id", ignoreIfNull = true)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @JSONProperty(value = "_rev", ignoreIfNull = true)
    public String getRevision() { return revision; }
    public void setRevision(String revision) { this.revision = revision; }

    @JSONProperty(value = "_attachments", ignoreIfNull = true)
    @JSONTypeHint(Attachment.class)
    public Map<String,Attachment> getAttachments() { return null; }
    public void setAttachments(Map<String,Attachment> attachments) { return; }

    @JSONProperty(value = "app_id", ignoreIfNull = true)
    public String getApplication() { return application; }

    @JSONProperty(value = "timestamp", ignoreIfNull = true)
    public String getTimeStamp() { return timestamp; }
    public void setTimeStamp( String timestamp ) { this.timestamp = timestamp; }

    @JSONProperty(value = "level", ignoreIfNull = true)
    public int getLevel() { return event.getLevel().toInt(); }

    @JSONProperty(value = "logger", ignoreIfNull = true)
    public String getLoggerName() { return event.getLoggerName(); }

    @JSONProperty(value = "message", ignoreIfNull = true)
    public Object getMessage() { return event.getMessage(); }

    @JSONProperty(value = "class", ignoreIfNull = true)
    public String getClassName() {
      if (!locationInfo) { return null; }
      return event.getLocationInformation().getClassName();
    }

    @JSONProperty(value = "file", ignoreIfNull = true)
    public String getFileName() {
      if (!locationInfo) { return null; }
      return event.getLocationInformation().getFileName();
    }

    @JSONProperty(value = "line", ignoreIfNull = true)
    public String getLineNumber() {
      if (!locationInfo) { return null; }
      return event.getLocationInformation().getLineNumber();
    }

    @JSONProperty(value = "method", ignoreIfNull = true)
    public String getMethodName() {
      if (!locationInfo) { return null; }
      return event.getLocationInformation().getMethodName();
    }

    @JSONProperty(value = "thread", ignoreIfNull = true)
    public String getThreadName() { return event.getThreadName(); }

    @JSONProperty(value = "throwable", ignoreIfNull = true)
    public String[] getThrowable() { return event.getThrowableStrRep(); }

    @JSONProperty(value = "NDC", ignoreIfNull = true)
    public String getNDC() { return event.getNDC(); }
  }

  /**
   * The dispatcher thread logic.
   */
  private class Dispatcher implements Runnable {
    private final CouchDBAppender parent;
    private final ArrayList<LoggingEventDocument> buffer;
    private List<LoggingEventDocument> docs;
    private final Hashtable mutex;

    /**
     *
     */
    public Dispatcher( CouchDBAppender parent,
		       ArrayList<LoggingEventDocument> buffer ) {
      this.parent = parent;
      this.buffer = buffer;
      docs = null;

      // We need a mutex that will prevent Log4j from shutting down while we
      // are in the middle of writing log messages to CouchDB. Log4j
      // synchronizes on a hashtable of appenders during shutdown and during
      // requests for loggers. This bit of Jva reflection is used to get a
      // reference to the hashtable. We will synchronize on the hastable
      // before writing to CouchDB.
      try {
        Hierarchy repo = (Hierarchy) LogManager.getLoggerRepository();
        Class<?> clazz = repo.getClass();
	Field field = clazz.getDeclaredField("ht");
	field.setAccessible(true);
	mutex = (Hashtable) field.get(repo);
      } catch (Exception e) {
	throw new RuntimeException(e);
      }
    }

    /**
     * {@inheritDoc}
     */
    public void run() {
      try {
	while (!parent.closed) {
          dispatch();
	}
      } catch (InterruptedException ex) {
        Thread.currentThread().interrupt();  // reassert
      }
    }

    @SuppressWarnings("unchecked")
    private void dispatch() throws InterruptedException {
      try {
        synchronized (buffer) {
	  while (buffer.isEmpty() && !parent.closed) {
            buffer.wait(60000);
	  }

	  if (parent.closed) { return; }

          if (!buffer.isEmpty()) {
            docs = (List<LoggingEventDocument>) buffer.clone();
            buffer.clear();
          }
        }
        
	// we don't want the LogManager.shutdown() method to run until
	// after we have dispatched all the event documents to CouchDB
        synchronized (mutex) {
          try {
            if (docs != null) { db.bulkCreateDocuments(docs); }
          } catch (CouchDBException ex) {
            LogLog.error(
              "Could not send logging events to CouchDB at 'http://"
              + host + ":" + port + "/" + database + "'", ex);
          }
        }
      }
      finally { docs = null; }
    }
  }  // class Dispatcher
}
