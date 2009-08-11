
package com.pea53.log4j.couchdb;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.TimeZone;

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.helpers.LogLog;
import org.apache.log4j.spi.ErrorCode;
import org.apache.log4j.spi.LoggingEvent;

import org.svenson.JSON;
import org.svenson.JSONProperty;
import org.svenson.JSONTypeHint;

import org.jcouchdb.db.Database;
import org.jcouchdb.document.Attachment;
import org.jcouchdb.document.Document;


/**
    Sends {@link LoggingEvent} objects to a CouchDB instance.

    <p>The CouchDbAppender  has the following properties:

    <ul>

      <p><li>If sent to a {@link SocketNode}, remote logging is
      non-intrusive as far as the log event is concerned. In other
      words, the event will be logged with the same time stamp, {@link
      org.apache.log4j.NDC}, location info as if it were logged locally by
      the client.

      <p><li>SocketAppenders do not use a layout. They ship a
      serialized {@link LoggingEvent} object to the server side.

      <p><li>Remote logging uses the TCP protocol. Consequently, if
      the server is reachable, then log events will eventually arrive
      at the server.

      <p><li>If the remote server is down, the logging requests are
      simply dropped. However, if and when the server comes back up,
      then event transmission is resumed transparently. This
      transparent reconneciton is performed by a <em>connector</em>
      thread which periodically attempts to connect to the server.

      <p><li>Logging events are automatically <em>buffered</em> by the
      native TCP implementation. This means that if the link to server
      is slow but still faster than the rate of (log) event production
      by the client, the client will not be affected by the slow
      network connection. However, if the network connection is slower
      then the rate of event production, then the client can only
      progress at the network rate. In particular, if the network link
      to the the server is down, the client will be blocked.

      <p>On the other hand, if the network link is up, but the server
      is down, the client will not be blocked when making log requests
      but the log events will be lost due to server unavailability.

      <p><li>Even if a <code>SocketAppender</code> is no longer
      attached to any category, it will not be garbage collected in
      the presence of a connector thread. A connector thread exists
      only if the connection to the server is down. To avoid this
      garbage collection problem, you should {@link #close} the the
      <code>SocketAppender</code> explicitly. See also next item.

      <p>Long lived applications which create/destroy many
      <code>SocketAppender</code> instances should be aware of this
      garbage collection problem. Most other applications can safely
      ignore it.

      <p><li>If the JVM hosting the <code>SocketAppender</code> exits
      before the <code>SocketAppender</code> is closed either
      explicitly or subsequent to garbage collection, then there might
      be untransmitted data in the pipe which might be lost. This is a
      common problem on Windows based systems.

      <p>To avoid lost data, it is usually sufficient to {@link
      #close} the <code>SocketAppender</code> either explicitly or by
      calling the {@link org.apache.log4j.LogManager#shutdown} method
      before exiting the application.


     </ul>

    @author  Tim Pease
    @since 0.1.0 */

public class CouchDbAppender extends AppenderSkeleton {

  static public final String DEFAULT_HOST     = "localhost";
  static public final int    DEFAULT_PORT     = 5984;
  static public final String DEFAULT_DATABASE = "logging";

  String host;
  int port;
  String database;
  String application;
  boolean locationInfo;

  private Database db;
  private SimpleDateFormat isoDateFormat;

  /**
   * Connects to the CouchDB server at the default host and port.
   */
  public CouchDbAppender() {
    this(DEFAULT_HOST, DEFAULT_PORT, DEFAULT_DATABASE);
  }

  /**
   * Connects to the CouchDB server at <code>host</code> using the default
   * port.
   */
  public CouchDbAppender( String host ) {
    this(host, DEFAULT_PORT, DEFAULT_DATABASE);
  }

  /**
   * Connects to the CouchDB server at <code>host</code> and
   * <code>port</code>.
   */
  public CouchDbAppender( String host, int port ) {
    this(host, port, DEFAULT_DATABASE);
  }

  /**
   *
   */
  public CouchDbAppender( String host, int port, String database ) {
    this.host = host;
    this.port = port;
    this.database = database;

    application = null;
    locationInfo = false;

    isoDateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    isoDateFormat.setTimeZone(TimeZone.getTimeZone("Etc/UTC"));
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
  synchronized public void close() {
    if (closed) { return; }

    this.closed = true;
    cleanUp();
  }

  /**
   * Drop the connection to the remote host and release the underlying
   * connector thread if it has been created 
   */
  public void cleanUp() {
  }

  /**
   *
   */
  public void append( LoggingEvent event ) {
    if (locationInfo) { event.getLocationInformation(); }
    LoggingEventDocument doc = new LoggingEventDocument(event);
    db.createDocument(doc);
  }

  /**
   * The CouchDbAppender does not use a layout. Hence, this method
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
   *
   * @author Tim Pease
   * @since 0.1.0
   */
  public class LoggingEventDocument implements Document {
    private String id;
    private String revision;
    private LoggingEvent event;

    public LoggingEventDocument() {}
    public LoggingEventDocument( LoggingEvent event ) { this.event = event; }

    @JSONProperty( value = "_id", ignoreIfNull = true)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @JSONProperty( value = "_rev", ignoreIfNull = true)
    public String getRevision() { return revision; }
    public void setRevision(String revision) { this.revision = revision; }

    @JSONProperty( value = "_attachments", ignoreIfNull = true)
    @JSONTypeHint(Attachment.class)
    public Map<String,Attachment> getAttachments() { return null; }
    public void setAttachments(Map<String,Attachment> attachments) { return; }

    @JSONProperty( value = "app_id", ignoreIfNull = true) 
    public String getApplication() { return application; }

    @JSONProperty( value = "timestamp", ignoreIfNull = true) 
    public String getTimeStamp() {
      Date date = new Date(event.getTimeStamp());
      return isoDateFormat.format(date);
    }

    @JSONProperty( value = "level", ignoreIfNull = true) 
    public int getLevel() { return event.getLevel().toInt(); }

    @JSONProperty( value = "logger", ignoreIfNull = true) 
    public String getLoggerName() { return event.getLoggerName(); }

    @JSONProperty( value = "message", ignoreIfNull = true) 
    public Object getMessage() { return event.getMessage(); }
  }
}
