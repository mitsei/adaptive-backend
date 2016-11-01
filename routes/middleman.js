var express = require('express');
var router = express.Router();
var request = require('request');
var rp = require('request-promise');
let Q = require('q');
let _ = require('lodash');

let credentials = require('../credentials');

// use these two modified fetch libraries instead of those in
// fbw-utils because we know these (request-promise) work with Express
// and qbank signing in Node
let qbank = require('../lib/qBankFetch')(credentials);
let handcar = require('../lib/handcarFetch')(credentials);

var fbwUtils = require('fbw-utils')(credentials);
var ConvertDate2Dict = fbwUtils.ConvertDateToDictionary;

// these need to be the same constant value in the client-apps, too
let SHARED_MISSIONS_GENUS = "assessment-bank-genus%3Afbw-shared-missions%40ODL.MIT.EDU"
let PRIVATE_MISSIONS_GENUS = "assessment-bank-genus%3Afbw-private-missions%40ODL.MIT.EDU"

let STUDENT_TAKING_AUTHZ_FUNCTIONS = ['assessment.AssessmentTaken%3Acreate%40ODL.MIT.EDU',
                                      'assessment.AssessmentTaken%3Alookup%40ODL.MIT.EDU',
                                      'assessment.Assessment%3Atake%40ODL.MIT.EDU']

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
  var domain = 'algebra';  // default
  if (id.indexOf('@') >= 0) {
    id = encodeURIComponent(id)
  }
  _.each(domainMapping, (idList, domainName) => {
    if (idList.indexOf(id) >= 0) {
      domain = domainName;
    }
  });
  return domain;
}

function getHandcarBankId(contentLibraryId) {
  let domain = getDomain(contentLibraryId).toLowerCase();
  return handcarDomainBanks[domain];
}

function getHandcarFamilyId(contentLibraryId) {
  let domain = getDomain(contentLibraryId).toLowerCase();
  return handcarDomainFamilies[domain];
}
// ==========
  // API to receive requests from client side
  // @cole: help needed
// ==========

// utility method to generate the private bank alias. Needs to match
// the method in the client-side apps as well...should be in a
// shared library.
function privateBankAlias(termBankId, username) {
  // should return something like "private-bank%3A1234567890abcdef12345678-S12345678.acc.edu%40ODL.MIT.EDU"
  return `private-bank%3A${termBankId.match(/:(.*)@/)[1]}-${username.replace('@', '.')}%40ODL.MIT.EDU`
}

// utility method to get the sharedBankId for CRUD on shared missions...
function getSharedBankId(bankId) {
  let sharedBankOptions = {
    path: `assessment/hierarchies/nodes/${bankId}/children`
  }, sharedBank = {};

  return qbank(sharedBankOptions)
  .then( function(result) {
    let children = JSON.parse(result).data.results
    if (children.length == 0) {
      // create the shared mission bank
      let createSharedBankOptions = {
        method: 'POST',
        path: 'assessment/banks',
        data: {
          name: 'Shared missions bank',
          description: 'For all students in a class',
          genusTypeId: SHARED_MISSIONS_GENUS
        }
      };

      return qbank(createSharedBankOptions)
      .then( function (newBank) {
        sharedBank = JSON.parse(newBank);
        let createChildrenOptions = {
          method: 'POST',
          path: `assessment/hierarchies/nodes/${bankId}/children`,
          data: {
            ids: [sharedBank.id]
          }
        };
        // no existing children, so can just stick this as the first child
        return qbank(createChildrenOptions)
      })
      .then( function (updatedChildren) {
        return Q.when(sharedBank.id)
      })
    } else {
      // just create the assessment in the child bank with genus SHARED_MISSIONS_GENUS
      let sharedBank = _.find(children, {genusTypeId: SHARED_MISSIONS_GENUS});

      return Q.when(sharedBank.id)
    }
  })
}

// utility method to get the private bank of a student, or
// to set it up / create the alias / set up the hierarchy / set student authz
//    class term bank
//         |-----Private user banks (aliased per method above)
//         |          |
//         |-----Shared bank
function getPrivateBankId(bankId, username) {
  // assumption is that the shared bank already exists
  // the private bank may or may not exist
  let privateBankAliasId = privateBankAlias(bankId, username),
    privateBankTestOptions = {
      path: `assessment/banks/${privateBankAliasId}`
    }, privateBank = {}, currentChildren = [];

  return qbank(privateBankTestOptions)
  .then( function (result) {
    // private bank exists
    return Q.when(JSON.parse(result).id)
  })
  .catch( function (error) {
    // let's create the bank!
    // create the private bank and set authz / create hierarchies
    let createPrivateBankOptions = {
      method: 'POST',
      path: 'assessment/banks',
      data: {
        name: `Private mission bank for ${username}`,
        description: `${username}'s missions for bank ${bankId}`,
        genusTypeId: PRIVATE_MISSIONS_GENUS,
        aliasId: privateBankAliasId
      }
    };

    return qbank(createPrivateBankOptions)
    .then( function (newBank) {
      privateBank = JSON.parse(newBank);
      // get the original bankId's current children first
      // and append the private bankId
      let getCurrentChildrenOptions = {
        path: `assessment/hierarchies/nodes/${bankId}/children`
      }
      return qbank(getCurrentChildrenOptions)
    })
    .then( function (children) {
      currentChildren = JSON.parse(children).data.results
      currentChildren = _.map(currentChildren, 'id')
      currentChildren = currentChildren.concat(privateBank.id)
      let createChildrenOptions = {
        method: 'POST',
        path: `assessment/hierarchies/nodes/${bankId}/children`,
        data: {
          ids: currentChildren
        }
      }
      return qbank(createChildrenOptions)
    })
    .then( function (updatedChildren) {
      // now add the shared bank as a child of the private bank
      return getSharedBankId(bankId)
    })
    .then( function (sharedBankId) {
      let addSharedBankToPrivateBankOptions = {
        method: 'POST',
        path: `assessment/hierarchies/nodes/${privateBank.id}/children`,
        data: {
          ids: [sharedBankId]
        }
      }
      return qbank(addSharedBankToPrivateBankOptions)
    })
    .then( function (updatedChildren) {
      // now configure authz so students can "take" in the private bank
      let now = new Date(),
        endDate = ConvertDate2Dict(now),
        privateBankAuthzOptions = {
          method: 'POST',
          path: `authorization/authorizations`,
          data: {
            bulk: []
          }
        }
      endDate.month = endDate.month + 6;

      if (endDate.month > 12) {
        endDate.month = endDate.month - 12;
        endDate.year++;
      }

      if (endDate.month == 2 && endDate.day > 28) {
        endDate.day = 28;
      }

      if ([4, 6, 9, 11].indexOf(endDate.month) >= 0 && endDate.day == 31) {
        endDate.day = 30;
      }

      _.each(STUDENT_TAKING_AUTHZ_FUNCTIONS, (functionId) => {
        privateBankAuthzOptions.data.bulk.push({
          agentId: username,
          endDate: endDate,
          qualifierId: privateBank.id,
          functionId: functionId
        })
      })

      return qbank(privateBankAuthzOptions)
    })
    .then( function (authzResponse) {
      return Q.when(privateBank.id)
    })
  })
}

// so the full path for this endpoint is /middleman/...
router.post('/authorizations', setAuthorizations);
router.get('/banks', getBanks);
router.get('/banks/:bankId', getBankDetails);
router.put('/banks/:bankId', editBankDetails);
router.get('/banks/:bankId/items', getBankItems);
router.get('/banks/:bankId/missions', getMissions);
router.post('/banks/:bankId/missions', addSharedMission);
router.post('/banks/:bankId/personalmissions', addPersonalizedMission);
router.delete('/banks/:bankId/missions/:missionId', deleteMission);
router.put('/banks/:bankId/missions/:missionId', editMission);
router.get('/banks/:bankId/missions/:missionId/items', getMissionItems);
router.put('/banks/:bankId/missions/:missionId/items', setMissionItems);
// router.put('/banks/:bankId/offereds/:offeredId', editOffered);
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

function addSharedMission(req, res) {
  // create assessment + offered
  // This is the endpoint for creating a shared mission that
  //   all students in the class need to take
  // It creates the mission in a child bank of
  //   genusTypeId: "assessment-bank-genus%3Afbw-shared-missions%40ODL.MIT.EDU"
  let assessment = {};

  Q.when(getSharedBankId(req.params.bankId))
  .then( function (sharedBankId) {
    let assessmentOptions = {
      data: req.body,
      method: 'POST',
      path: `assessment/banks/${sharedBankId}/assessments`
    },
      assessment = {};

    return qbank(assessmentOptions)
      .then( function(result) {
        assessment = JSON.parse(result);
        // now create the offered
        let offeredOption = {
          data: req.body,
          method: 'POST',
          path: `assessment/banks/${sharedBankId}/assessments/${assessment.id}/assessmentsoffered`
        };
        return qbank(offeredOption);
      })
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

function addPersonalizedMission(req, res) {
  // create assessment + offered in a student's private bank
  // This is the endpoint for creating a personalized mission that
  //   only a single student has authorization to take
  // It creates the mission in a child bank of
  //   genusTypeId: "assessment-bank-genus%3Afbw-private-missions%40ODL.MIT.EDU"
  let assessment = {};

  Q.when(getPrivateBankId(req.params.bankId, req.body.username))
  .then( function (privateBankId) {
    let assessmentOptions = {
      data: req.body,
      method: 'POST',
      path: `assessment/banks/${privateBankId}/assessments`
    },
      assessment = {};

    return qbank(assessmentOptions)
      .then( function(result) {
        assessment = JSON.parse(result);
        // now create the offered
        let offeredOption = {
          data: req.body,
          method: 'POST',
          path: `assessment/banks/${privateBankId}/assessments/${assessment.id}/assessmentsoffered`
        };
        return qbank(offeredOption);
      })
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
  }, updatedMission;

  qbank(options)
  .then( function(result) {
    updatedMission = _.assign({}, JSON.parse(result));
    // edit an assessment offered, i.e. start date / deadline
    let options = {
      data: {
        startTime: req.body.startTime,
        deadline: req.body.deadline
      },
      method: 'PUT',
      path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${req.body.assessmentOfferedId}`
    };

    return qbank(options)
  })
  .then( function(result) {
    result = JSON.parse(result);
    updatedMission.startTime = result.startTime;
    updatedMission.deadline = result.deadline;
    updatedMission.assessmentOfferedId = result.id;
    return res.send(updatedMission);             // this line sends back the response to the client
  })
  .catch( function(err) {
    return res.status(err.statusCode).send(err.message);
  });
}
//
// function editOffered(req, res) {
//   // edit an assessment offered, i.e. start date / deadline
//   let options = {
//     data: req.body,
//     method: 'PUT',
//     path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${req.params.offeredId}`
//   };
//
//   qbank(options)
//   .then( function(result) {
//     return res.send(result);             // this line sends back the response to the client
//   })
//   .catch( function(err) {
//     return res.status(err.statusCode).send(err.message);
//   });
// }

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
  if (_.keys(domainMapping).indexOf(req.params.departmentName.toLowerCase()) >= 0) {
    return res.send(domainMapping[req.params.departmentName.toLowerCase()][0]);
  } else {
    return res.send('Unknown department');
  }
}



module.exports = router;
