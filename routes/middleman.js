var express = require('express');
var router = express.Router();
var request = require('request');
var rp = require('request-promise');
let Q = require('q');
let _ = require('lodash');

let credentials = require('../credentials');
let qbank = require('../lib/qBankFetch')(credentials);
let handcar = require('../lib/handcarFetch')(credentials);

let domainMapping = {
  'algebra': ['assessment.Bank%3A57279fb9e7dde086d01b93ef%40bazzim.MIT.EDU', 'mc3-objectivebank%3A2823%40MIT-OEIT'],
  'accounting': ['assessment.Bank%3A57279fbce7dde086c7fe20ff%40bazzim.MIT.EDU', 'mc3-objectivebank%3A2821%40MIT-OEIT'],
  'cad': ['assessment.Bank%3A57279fbfe7dde08818af5661%40bazzim.MIT.EDU', 'mc3-objectivebank%3A2822%40MIT-OEIT']
};

let handcarDomainBanks = {
  'algebra': 'mc3-objectivebank%3A2823%40MIT-OEIT',
  'accounting': 'mc3-objectivebank%3A2821%40MIT-OEIT',
  'cad': 'mc3-objectivebank%3A2822%40MIT-OEIT'
};

let handcarDomainFamilies = {
  'algebra': 'mc3-family%3A149%40MIT-OEIT',
  'accounting': 'mc3-family%3A147%40MIT-OEIT',
  'cad': 'mc3-family%3A148%40MIT-OEIT'
};

function getDomain(id) {
  let domain = 'algebra';  // default
  _.each(domainMapping, (idList, domainName) => {
    if (idList.indexOf(id) >= 0) {
      domain = domainName;
      return false;
    }
  });
  return domain;
}

function getHandcarBankId(contentLibraryId) {
  let domain = getDomain(contentLibraryId);
  return handcarDomainBanks[domain];
}

function getHandcarFamilyId(contentLibraryId) {
  let domain = getDomain(contentLibraryId);
  return handcarDomainFamilies[domain];
}
// ==========
  // API to receive requests from client side
  // @cole: help needed
// ==========

// so the full path for this endpoint is /middleman/...
router.post('/authorizations', setAuthorizations);
router.get('/banks', getBanks);
router.get('/banks/:bankId', getBankDetails);
router.put('/banks/:bankId', editBankDetails);
router.get('/banks/:bankId/items', getBankItems);
router.get('/banks/:bankId/missions', getMissions);
router.post('/banks/:bankId/missions', addMission);
router.delete('/banks/:bankId/missions/:missionId', deleteMission);
router.put('/banks/:bankId/missions/:missionId', editMission);
router.get('/banks/:bankId/missions/:missionId/items', getMissionItems);
router.put('/banks/:bankId/missions/:missionId/items', setMissionItems);
router.put('/banks/:bankId/offereds/:offeredId', editOffered);
router.get('/banks/:bankId/offereds/:offeredId/results', getMissionResults);
router.get('/departments/:departmentName/library', getDepartmentLibraryId);
router.get('/hierarchies/:nodeId/children', getNodeChildren);
router.post('/hierarchies/:nodeId/children', setNodeChildren);
router.get('/objectivebanks/:contentLibraryId/modules', getModules);
router.get('/objectivebanks/:contentLibraryId/outcomes', getOutcomes);
router.get('/objectivebanks/:contentLibraryId/relationships', getRelationships);

function getBanks(req, res) {
  // TODO: This needs to also include req.query params, when executing the
  // qbank call
  let queryParams = _.map(req.query, (val, key) => {
      return key + '=' + val;
    }),
    options = {
      path: `assessment/banks?${queryParams.join('&')}`
    };

    qbank(options)
    .then( function(result) {
      return res.send(result);             // this line sends back the response to the client
    })
    .catch( function(err) {
      return res.status(err.statusCode).send(err.message);
    });
}

function editBankDetails(req, res) {
  // Edit a specific bank, i.e. to alias a D2L term ID
  let options = {
    data: req.body,
    method: 'PUT',
    path: `assessment/banks/${req.params.bankId}`
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

function getBankItems(req, res) {
  // Gets you all of the items in a bank
  let options = {
    path: `assessment/banks/${req.params.bankId}/items?page=all&unrandomized`
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

function getMissionItems(req, res) {
  // Deprecated with the new LO-focused way to define the missions? Oct 25, 2016
  // Gets the items in a specific mission
  let options = {
    path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}/items?sections&page=all`
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

function getModules(req, res) {
  // Gets you all of the modules, for an objective bank
  let bankId = getHandcarBankId(req.params.contentLibraryId),
    options = {
      path: `/learning/objectivebanks/${bankId}/objectives?genustypeid=mc3-objective%3Amc3.learning.topic%40MIT-OEIT`
    };

  // do this async-ly
  handcar(options)
  .then( function(result) {
    return res.send(result);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function getOutcomes(req, res) {
  // Gets you all of the outcomes, for an objective bank
  let bankId = getHandcarBankId(req.params.contentLibraryId),
    options = {
      path: `/learning/objectivebanks/${bankId}/objectives?genustypeid=mc3-objective%3Amc3.learning.outcome%40MIT-OEIT`
    };

  // do this async-ly
  handcar(options)
  .then( function(result) {
    return res.send(result);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function getRelationships(req, res) {
  // Gets you all of the relationships for an objective bank
  //  NOte that this requires the familyId, which appears in the
  //  hardcoded handcar settings, on the client-side
  let familyId = getHandcarFamilyId(req.params.contentLibraryId),
    options = {
      path: `/relationship/families/${familyId}/relationships?genustypeid=mc3-relationship%3Amc3.lo.2.lo.requisite%40MIT-OEIT&genustypeid=mc3-relationship%3Amc3.lo.2.lo.parent.child%40MIT-OEIT`
    };

  // do this async-ly
  handcar(options)
  .then( function(result) {
    return res.send(result);             // this line sends back the response to the client
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

function setAuthorizations(req, res) {
  // bulk-set the authorizations
  let options = {
    data: req.body,
    method: 'POST',
    path: `authorization/authorizations`
  };

  qbank(options)
  .then( function(result) {
    return res.send(result);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}

function setMissionItems(req, res) {
  // Deprecated with the new LO-focused way to define the missions? Oct 25, 2016
  // Sets the items in a specific mission
  return res.status(500).send('deprecated endpoint');
}

function getNodeChildren(req, res) {
  // Gets you the assessment bank hierarchy children for the given nodeId
  let options = {
    path: `assessment/hierarchies/nodes/${req.params.nodeId}/children`
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

function setNodeChildren(req, res) {
  // Set the assessment bank hierarchy children for the given nodeId
  let options = {
    data: req.body,
    method: 'POST',
    path: `assessment/hierarchies/nodes/${req.params.nodeId}/children`
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

function getDepartmentLibraryId(req, res) {
  if (_.keys(domainMapping).indexOf(req.params.departmentName) >= 0) {
    return res.send(domainMapping[req.params.departmentName][0]);
  } else {
    return res.send('Unknown department');
  }
}



module.exports = router;
