var express = require('express');
var path = require('path');
const http = require('http');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var middleman = require('./routes/middleman')
let d2l = require('./routes/d2l')
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.text({limit: '50mb'}))
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ===
// enable cors
//
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-fbw-username");
  res.header("Access-Control-Allow-Methods", "Options, PUT, POST, DELETE, GET");
  next();
});


app.use('/', routes);
app.use('/users', users);     // boilerplate code
app.use('/middleman', middleman);
app.use('/mock-d2l', d2l)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});



// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

const httpServer = http.createServer(app);
httpServer.listen(process.env.PORT || 8888);

// let listener = app.listen(process.env.PORT || 8888, function(){
//     console.log('Listening on port ' + listener.address().port); //Listening on port 8888
// });

// module.exports = app;
module.exports = httpServer;
