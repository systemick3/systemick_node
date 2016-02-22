var http = require('http'),
  path = require('path'),
  fs = require('fs'),
  express = require('express'),
  mongoskin = require('mongoskin'),
  bodyParser = require('body-parser'),
  morgan = require('morgan'),
  routes = require('./routes'),
  config = require('./config'),
  expressJwt = require('express-jwt'),
  jwt = require('jsonwebtoken'),
  session = require('express-session'),
  app = express();

app.set('port', process.env.PORT || config.port || 3007);
app.set('env', process.env.NODE_ENV || config.env || 'development');
app.set("jsonp callback", true);

/////////////////////////// DATABASE CONNECTIONS /////////////////////////////////

var dbUrl = process.env.MONGOHQ_URL ||  config.mongo;
if (!dbUrl) {
  throw new Error('Missing url for mongodb');
}
var db = mongoskin.db(dbUrl, { native_parser: true });
var ObjectID = mongoskin.ObjectID;

var twitterCache = {};
var tweetappDbUrl = config.tweetapp.dbUrl;
var tweetappDb = mongoskin.db(tweetappDbUrl, { native_parser: true });

///////////////////////////////////////////////////////////////////////////////////

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: config.sessionSalt,
  resave: true,
  saveUninitialized: true
}));

// Development error handler
// Will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// Production error handler
// No stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Logging print to both the console and a logfile
// Use morgan for logging errors
var logfile = fs.createWriteStream('./logs/access.log', { flags: 'a' });
app.use(morgan("combined", {stream: logfile}));
app.use(morgan("dev"));
var errorLogger = require('./utils/errorLogger');

app.use(function (req, res, next) {
  req.db = db;
  req.objectID = ObjectID;
  req.twitterCache = twitterCache;
  req.tweetappDb = tweetappDb;
  req.jwt = jwt;
  next();
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

// The routes below require authentication
//app.use('/tweetapp/auth', expressJwt({ secret: config.cookieSalt }));

//////////////////////////////// ROUTES /////////////////////////////////////

routes.attachHandlers(app);

// Default routes
app.get('/', function (req, res, next) {
  res.send('please select a collection, e.g., /api/skills');
});
app.get('/api', function (req, res, next) {
  res.send('please select a collection, e.g., /api/skills');
});
app.get('/twitter', function (req, res, next) {
  res.send('please select a collection, e.g., /api/skills');
});

// Fallback to 404 if route not found
app.get('*', function (req, res) {
  res.sendStatus(404);
  res.end('Page not found');
});

//////////////////////////////////////////////////////////////////////////////

// Create server
var server = http.createServer(app);

var boot = function () {
  server.listen(app.get('port'), function () {
    console.info('Express server listening on port ' + app.get('port'));
    console.info('Current environment is ' + app.get('env'));
  });
};

var shutdown = function () {
  server.close();
};

if (require.main === module) {
  boot();
} else {
  console.info('Running app as a module');
  exports.boot = boot;
  exports.shutdown = shutdown;
  exports.port = app.get('port');
  console.log('port is ' + app.get('port'));
}