require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const utils = require('./utils');
let mysql = require('mysql');
let dbconfig = require('./config.js');
let dbconnection = mysql.createConnection(dbconfig);
const app = express();
const port = process.env.PORT || 4000;

// static user details
const userData = {
  userId: "789789",
  password: "admin",
  name: "admin",
  username: "admin",
  isAdmin: true
};

// enable CORS
app.use(cors());
// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));


//middleware that checks if JWT token exists and verifies it if it does exist.
//In all future routes, this helps to know if the request is authenticated or not.
app.use(function (req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.headers['authorization'];
  if (!token) return next(); //if no token, continue

  token = token.replace('Bearer ', '');
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid user."
      });
    } else {
      req.user = user; //set the user to req so other routes can use it
      next();
    }
  });
});


// request handlers
app.get('/', (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Invalid user to access it.' });
  res.send('Welcome to the photosoc leaderboard - ' + req.user.name);
});

// react will fetch this for the home menu
// node will act as a restful api and will give it all the leaderboard data
app.get('/leaderboard', (req, res) => {

  let sql = `SELECT * FROM leaderboard ORDER BY xp DESC;`;
  //res.send('this is the leaderboard!!!!');
  dbconnection.query(sql, (err, result,fields) => {
    if (err)
      throw err;
    res.send(result);
    
  });
});

//add user to the database using post
// automatically sets the user xp to zero on all

app.post('/database/adduser', function (req, res) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Invalid user to access it.' });
  const user = req.body.username;
  const xp = 0;

  let sql = `INSERT INTO leaderboard(username,xp)
           VALUES(?,?); `;

  dbconnection.query(sql, [user, xp], (err, result) => {
    if (err)
      throw err;
    res.send("username recieved");
  });
});
// increment a users experience
// must pass the username of the user and the number they wish to increment it by
// adding the number incrments it finally

app.post('/database/incrementuser', function (req, res) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Invalid user to access it.' });
  const user = req.body.username;
  const xp = req.body.xp;



  //let sqlup = `UPDATE leaderboard SET xp += insertedxp WHERE username = user VALUES(?,?); `;
  dbconnection.query('UPDATE leaderboard SET xp = xp + ? WHERE username = ?', [xp, user], (err, result) => {
    if (err)
      throw err;
    res.send("user and xp recieved");
    console.log("Number of records inserted: " + result.affectedRows);
  });


});

// validate the user credentials
app.post('/users/signin', function (req, res) {
  const user = req.body.username;
  const pwd = req.body.password;

  // return 400 status if username/password is not exist
  if (!user || !pwd) {
    return res.status(400).json({
      error: true,
      message: "Username or Password required."
    });
  }

  // return 401 status if the credential is not match.
  if (user !== userData.username || pwd !== userData.password) {
    return res.status(401).json({
      error: true,
      message: "Username or Password is Wrong."
    });
  }

  // generate token
  const token = utils.generateToken(userData);
  // get basic user details
  const userObj = utils.getCleanUser(userData);
  // return the token along with user details
  return res.json({ user: userObj, token });
});


// verify the token and return it if it's valid
app.get('/verifyToken', function (req, res) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token;
  if (!token) {
    return res.status(400).json({
      error: true,
      message: "Token is required."
    });
  }
  // check token that was passed by decoding token using secret
  jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
    if (err) return res.status(401).json({
      error: true,
      message: "Invalid token."
    });

    // return 401 status if the userId does not match.
    if (user.userId !== userData.userId) {
      return res.status(401).json({
        error: true,
        message: "Invalid user."
      });
    }
    // get basic user details
    var userObj = utils.getCleanUser(userData);
    return res.json({ user: userObj, token });
  });
});

app.listen(port, () => {
  console.log('Server started on: ' + port);
});