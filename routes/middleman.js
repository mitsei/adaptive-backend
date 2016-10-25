var express = require('express');
var router = express.Router();
var request = require('request');
var rp = require('request-promise');

let credentials = require('../credentials');
let qbank = require('../lib/qBankFetch')(credentials);

// ==========
  // API to receive requests from client side
  // @cole: help needed
// ==========

// so the full path for this endpoint is /middleman/...
router.get('/banks/:bankId', getBankDetails);
router.get('/missions', getMissions);
router.post('/missions', addMission);


function getBankDetails(req, res) {
  // Gets you displayName and description of a specific bankId
  let options = {
    path: `assessment/banks/${req.params.bankId}/`
  };

  // do this async-ly
  qbank(options)
  .then( function(result) {
    return res.send(result);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function getMissions(req, res) {
  // return res.send('ok!');       // go to localhost:8888/middleman/missions to make sure this is running ok

  let options = {
    uri: 'https://qbank-dev.mit.edu/api/v2/assessment/banks/assessment.Bank:57d70ed471e482a74879349a@bazzim.MIT.EDU/assessments?sections&page=all'
  };

  // do this async-ly
  rp(options)
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
