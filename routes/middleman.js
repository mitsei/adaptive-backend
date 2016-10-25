var express = require('express');
var router = express.Router();
var request = require('request');
var rp = require('request-promise');
let Q = require('q');
let _ = require('lodash');

let credentials = require('../credentials');
let qbank = require('../lib/qBankFetch')(credentials);

// ==========
  // API to receive requests from client side
  // @cole: help needed
// ==========

// so the full path for this endpoint is /middleman/...
router.get('/banks/:bankId', getBankDetails);
router.get('/banks/:bankId/missions', getMissions);
router.post('/banks/:bankId/missions', addMission);
router.delete('/banks/:bankId/missions/:missionId', deleteMission);
router.put('/banks/:bankId/missions/:missionId', editMission);
router.put('/banks/:bankId/offereds/:offeredId', editOffered);
router.get('/banks/:bankId/offereds/:offeredId/results', getMissionResults);


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

function getMissionResults(req, res) {
  // Gets the student results for a specific offered
  let options = {
    path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${req.params.offeredId}/results?page=all`
  };

  // do this async-ly
  qbank(options)
  .then( function(result) {
    result = JSON.parse(result);
    return res.send(result.data.results);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function getMissions(req, res) {
  // get assessments + offereds
  // return res.send('ok!');       // go to localhost:8888/middleman/missions to make sure this is running ok

  let assessmentOptions = {
    path: `assessment/banks/${req.params.bankId}/assessments?sections&page=all`
  },
  assessments = [];

  // do this async-ly
  qbank(assessmentOptions)
  .then( function(result) {
    // now concat with offereds for each assessment
    let offeredsOptions = [];
    result = JSON.parse(result);

    if (result.data.count == 0) {
      return Q.when([]);
    }

    assessments = result.data.results;
    _.each(assessments, (assessment) => {
      let offeredOption = {
        path: `assessment/banks/${req.params.bankId}/assessments/${assessment.id}/assessmentsoffered`
      };
      offeredsOptions.push(qbank(offeredOption));
    });
    return Q.all(offeredsOptions);
  })
  .then( (responses) => {
    _.each(responses, (responseString, index) => {
      let response = JSON.parse(responseString);
      assessments[index].startTime = response.data.results[0].startTime;
      assessments[index].deadline = response.data.results[0].deadline;
      assessments[index].assessmentOfferedId = response.data.results[0].id;
    })
    return res.send(assessments);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function addMission(req, res) {
  // create assessment + offered
  let assessmentOptions = {
    data: req.body,
    method: 'POST',
    path: `assessment/banks/${req.params.bankId}/assessments`
  },
    assessment = {};

  qbank(assessmentOptions)
  .then( function(result) {
    assessment = JSON.parse(result);
    // now create the offered
    let offeredOption = {
      data: req.body,
      method: 'POST',
      path: `assessment/banks/${req.params.bankId}/assessments/${assessment.id}/assessmentsoffered`
    };
    return qbank(offeredOption);
  })
  .then( (result) => {
    let offered = JSON.parse(result);
    assessment.startTime = offered.startTime;
    assessment.deadline = offered.deadline;
    assessment.assessmentOfferedId = offered.id;
    return res.send(assessment);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function deleteMission(req, res) {
  // delete assessment + offered
  let offeredOptions = {
    method: 'DELETE',
    path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${req.body.assessmentOfferedId}`
  };

  qbank(offeredOptions)
  .then( function(result) {
    let assessmentOption = {
      method: 'DELETE',
      path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}`
    };
    return qbank(assessmentOption);
  })
  .then( (result) => {
    return res.send(result);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function editMission(req, res) {
  // edit an assessment, by adding / editing the parts within it
  let options = {
    data: req.body,
    method: 'PUT',
    path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}`
  };

  qbank(options)
  .then( function(result) {
    return res.send(result);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function editOffered(req, res) {
  // edit an assessment offered, i.e. start date / deadline
  let options = {
    data: req.body,
    method: 'PUT',
    path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${req.params.offeredId}`
  };

  qbank(options)
  .then( function(result) {
    return res.send(result);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}


module.exports = router;
