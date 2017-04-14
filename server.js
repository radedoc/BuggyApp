var express = require('express'),
    http = require('http'),
    path= require('path'),
    io = require('socket.io'),
    bodyParser = require('body-parser');

// webapp:
  var app = express();

  app.use(bodyParser.urlencoded({extended: true}))

  app.use(express.static(path.join(__dirname, 'public')));

// Page Routing
  app.set('port', process.env.PORT || 8081);
  //app.use(express.static(path.join(__dirname, 'visual')));

  app.get('/', function(req, res){
    res.sendFile(__dirname + '/main.html');
  })

  app.get('/about', function(req, res){
    res.sendFile(__dirname + '/about.html');
  })

  app.get('/login', function(req, res){
    res.sendFile(__dirname + '/login.html');
  })

  app.get('/**', function(req, res){
    res.sendFile(__dirname + '/Aindex.html');
  })

  // Set up express server
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Server running at http://127.0.0.1:' + app.get('port'));
});

// Set up socket.io
var io = require('socket.io').listen(server);

  // Not sure what this snippet does but will include it for the mean while.
  io.on('connection', function () {
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
});
