var express = require('express');
var router = express.Router();
var request = require('request');

let credentials = require('../credentials')

// ==========
  // API to receive requests from client side
  // @cole: help needed
// ==========

// so the full path for this endpoint is /middleman/...
router.get('/missions', getMissions);
router.post('/missions', addMission);


function getMissions(req, res) {
  // return res.send('ok!');       // go to localhost:8888/middleman/missions to make sure this is running ok

  let options = {

  };

  // do this async-ly
  request(options)
  .then( function(result) {
    return res.send(result);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function addMission(req, res) {
  // blah
}


module.exports = router;
