/******************************** Importing necessary modules ****************************/
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var mongodb = require('mongodb');
//var cookie_parser = require('cookie-parser');
var request = require('request');
var cheerio = require('cheerio');
var google = require('google');
var python = require('python-runner'); 
google.resultsPerPage = 1

/******************************** Setup ************************************************/

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var MongoClient = mongodb.MongoClient;
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 8081);
var db_url = "mongodb://ryanaw:c0d1ng!2@ds119091.mlab.com:19091/heroku_5w43r3p2";

/******************************** Page Routing ******************************************/

// Route to main page
app.get('/', function(req, res){
  res.sendFile(__dirname + '/main.html');
})

// Socket connection setup to aid in communication between server and clients.
io.on('connection', function(socket){
  socket.emit('welcome', {message: "Welcome to Buggy!"})
  socket.on('disconnect', function () {
  });

  socket.on('search', function(data){
    let query = data.message
    let language = "python"
    let reply = ""

    newsearch(query, language).then((url) => {
      return download(url)
    }).then((html) => {
        let answer = scrape(html)
        if (answer === '') {
        reply += 'No answer found :( \n'
      } else {
        reply += 'Found snippet! \n'
        reply += answer + '\n'
        newreply = reply.replace('\n', '<br>');
      }
      socket.emit('reply', {response: newreply})
    }).catch((error) => {
      console.log(error.reason)
    })
  })

  socket.on('execute', function(data){
     let code = data.message;
     python.exec(code).then(function(results){
	 socket.emit('executionresults', {response: results});
     });
  })

  socket.on('save', function(data){

  })
});

// Post method to deal with logins.
app.post('/newlog', function(req, res){
  var username = req.body.username
  console.log(req.body.username)
  var password = req.body.password
  loginAccount(username, password, redirectHome, redirectEmailCollision, res)
})

// Post method to deal with sign ups.
app.post('/createAccount', function(req, res){
  var email = req.body.email
  var username = req.body.username
  var password = req.body.password
  var passwordConf = req.body.passwordConf
  createAccount(email, password, passwordConf, username, redirectHome, redirectEmailCollision, res)
})

// Route to Sign up page.
app.get('/new_account', function(req, res){
  res.sendFile(__dirname + '/create_account.html')
})

app.get('/about', function(req, res) {
  res.sendFile(__dirname + '/about.html')
})

app.get('/tutorial', function(req, res) {
  res.sendFile(__dirname + '/tutorial.html')
})

app.get('/dd', function(req, res){
  res.sendFile(__dirname + '/Aindex.html')
})

app.get('/:username', function(req, res) {
  console.log(req.cookies)
  if (checkLoginStatus(req)){
    res.sendFile(__dirname + '/Aindex.html');
  }
  else {
    res.redirect('/')
  }
})

 // Deal with this later. 
app.get('//', function(req, res, next) {
  var loggedIn = checkLoginStatus(req);
  if (loggedIn) res.sendFile(__dirname + '/main.html');
  else res.sendFile(__dirname + '/about.html');;
});

// Logout Button.
app.get('/!', function(req, res, next) {
  res.cookie("user_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC")
  res.redirect("/login")
});

/*********************** Helper functions used in code snippets *****************************/
function newsearch(query, language) {
  return new Promise((resolve, reject) => {
    let searchString = `${query} in ${language} site:stackoverflow.com`

    google(searchString, (err, res) => {
      if (err) {
        reject({
          reason: 'A search error has occured :('
        })
      } else if (res.links.length === 0) {
        reject({
          reason: 'No results found :('
        })
      } else {
        resolve(res.links[0].href)
      }
    })
  })
}

function scrape(html) {
  $ = cheerio.load(html)
  return $('div.accepted-answer pre code').text()
}

function download(url) {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(body)
      } else {
        reject({
          reason: 'Unable to download page'
        })
      }
    })
  })
}

/********************* Helper functions used in Account creations and Logins *****************/

function createAccount(email, password, passwordConf, username, callbackSucc, callbackFail, res) {

  var salt = bcrypt. genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);

  if (password != passwordConf) {
    console.log(password)
    console.log(passwordConf)
    callbackFail(res)
  }
  else
  {
      // Connect to the Server
  MongoClient.connect(db_url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Database connection established');
    }

      var userDB = db.collection('users')
      //CHECK IF DB CONTAINS ACCOUNT WITH THAT EMAIL BEFORE CREATING NEW ACCOUNT
      userDB.find({'username' : username}).toArray(function(err, result) {
        if (err) {
            console.log(err);
        } else if (result.length) {
            callbackFail(res)
        } else {
              var userJSON = {"username": username, "email": email, "password": hash, "files": {}}
            userDB.insert(userJSON, function(err, result) {
            if (err) {
                console.log(err);
                } else {
                  console.log(username + " was added!")
                  callbackSucc(res, username)
                }
            })
          }
        })
    });
  }
}

function loginAccount(username, password, callbackSucc, callbackFail, res) {
  console.log('hi')

  // Connect to the Server
  MongoClient.connect(db_url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Database connection established');
    }

      var userDB = db.collection('users')
      console.log(username)
      userDB.find({'username' : username}).toArray(function(err, result) {
        console.log(result.length)
        if (err) {
            console.log(err);
        } 
        else if (result.length){
            console.log("THis is lit")

            if (bcrypt.compareSync(password, result[0]["password"]) != true) {
              console.log("uh oh")
              console.log(result[0]["password"])
              callbackFail(res)
            }
            else {
              callbackSucc(res, username)
            }
            
        } else {
            callbackFail(res)
          }
      })
    });
}

function redirectHome(res, username) {
  if (username.length == 0) {
    res.send("error") 
  }
  else {
    var cookie = "user_email=" + username + ";"
    res.cookie(cookie);
    res.redirect("/username")
  }
}

function redirectEmailCollision(res) {
  res.redirect("/")
}

function checkLoginStatus(req) {
  var cookie = req.cookies;
  if (cookie["user_email"] == undefined) return false
  if (cookie["user_email"].length == 0) return false
  else return true
}

/************************************** Starting the server **************************************/

  // Set up express server
var server = http.listen(app.get('port'), function(){
  console.log('Server running at http://127.0.0.1:' + app.get('port'));
});

