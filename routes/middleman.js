const express = require('express');

const router = express.Router();
const Q = require('q');
const _ = require('lodash');

const credentials = require('../credentials');

// use these two modified fetch libraries instead of those in
// fbw-utils because we know these (request-promise) work with Express
// and qbank signing in Node
const qbank = require('../lib/qBankFetch')(credentials);
const handcar = require('../lib/handcarFetch')(credentials);

const fbwUtils = require('fbw-utils')(credentials);

const ConvertDate2Dict = fbwUtils.ConvertDateToDictionary;
const privateBankAlias = fbwUtils.privateBankAlias;
const sharedBankAlias = fbwUtils.sharedBankAlias;

const getTakens = require('./_getTakens');
const deleteTaken = require('./_deleteTaken');
const deleteOffered = require('./_deleteOffered');

// these need to be the same constant value in the client-apps, too
const SHARED_MISSIONS_GENUS = 'assessment-bank-genus%3Afbw-shared-missions%40ODL.MIT.EDU';
const PRIVATE_MISSIONS_GENUS = 'assessment-bank-genus%3Afbw-private-missions%40ODL.MIT.EDU';
const HOMEWORK_MISSION_GENUS = 'assessment-genus%3Afbw-homework-mission%40ODL.MIT.EDU';
const DEPARTMENT_GENUS = 'assessment-bank-genus%3Afbw-department%40ODL.MIT.EDU';
const SUBJECT_GENUS = 'assessment-bank-genus%3Afbw-subject%40ODL.MIT.EDU';
const TERM_GENUS = 'assessment-bank-genus%3Afbw-term%40ODL.MIT.EDU';

const STUDENT_TAKING_AUTHZ_FUNCTIONS = ['assessment.AssessmentTaken%3Acreate%40ODL.MIT.EDU',
  'assessment.AssessmentTaken%3Alookup%40ODL.MIT.EDU',
  'assessment.Assessment%3Atake%40ODL.MIT.EDU'];

const domainMapping = {
  algebra: ['assessment.Bank%3A57279fb9e7dde086d01b93ef%40bazzim.MIT.EDU', 'mc3-objectivebank%3A2823%40MIT-OEIT'],
  accounting: ['assessment.Bank%3A57279fbce7dde086c7fe20ff%40bazzim.MIT.EDU', 'mc3-objectivebank%3A2821%40MIT-OEIT'],
  cad: ['assessment.Bank%3A57279fbfe7dde08818af5661%40bazzim.MIT.EDU', 'mc3-objectivebank%3A2822%40MIT-OEIT']
};

const handcarDomainBanks = {
  algebra: 'mc3-objectivebank%3A2823%40MIT-OEIT',
  accounting: 'mc3-objectivebank%3A2821%40MIT-OEIT',
  cad: 'mc3-objectivebank%3A2822%40MIT-OEIT'
};

const handcarDomainFamilies = {
  algebra: 'mc3-family%3A149%40MIT-OEIT',
  accounting: 'mc3-family%3A147%40MIT-OEIT',
  cad: 'mc3-family%3A148%40MIT-OEIT'
};

function getDomain(id) {
  let domain = 'algebra';  // default
  let encodedId = id;
  if (encodedId.indexOf('@') >= 0) {
    encodedId = encodeURIComponent(encodedId);
  }
  _.each(domainMapping, (idList, domainName) => {
    if (idList.indexOf(encodedId) >= 0) {
      domain = domainName;
    }
  });
  return domain;
}

function getHandcarBankId(contentLibraryId) {
  const domain = getDomain(contentLibraryId).toLowerCase();
  return handcarDomainBanks[domain];
}

function getHandcarFamilyId(contentLibraryId) {
  const domain = getDomain(contentLibraryId).toLowerCase();
  return handcarDomainFamilies[domain];
}
// ==========
  // API to receive requests from client side
  // @cole: help needed
// ==========

function getUsername(request) {
  const username = request.get('x-fbw-username');
  if (username && username !== 'null' && username !== 'undefined' && username !== 'false') {
    return `${username}`;  // make sure this is a string
  }

  return null;
}

function addStudentAuthz(bankId, username) {
  // now configure authz so students can "take" in the private bank
  const now = new Date();
  const endDate = ConvertDate2Dict(now);
  const privateBankAuthzOptions = {
    method: 'POST',
    path: 'authorization/authorizations',
    data: {
      bulk: []
    }
  };
  endDate.month += 6;

  if (endDate.month > 12) {
    endDate.month -= 12;
    endDate.year += 1;
  }

  if (endDate.month === 2 && endDate.day > 28) {
    endDate.day = 28;
  }

  if ([4, 6, 9, 11].indexOf(endDate.month) >= 0 && endDate.day === 31) {
    endDate.day = 30;
  }

  _.each(STUDENT_TAKING_AUTHZ_FUNCTIONS, (functionId) => {
    privateBankAuthzOptions.data.bulk.push({
      agentId: username,
      qualifierId: bankId,
      endDate,
      functionId
    });
  });

  return qbank(privateBankAuthzOptions);
}

function linkPrivateBanksIntoTerm(privateBankIds, termBankId) {
  // append the private bankIds
  const createChildrenOptions = {
    method: 'POST',
    path: `assessment/hierarchies/nodes/${termBankId}/children`,
    data: {
      ids: privateBankIds
    }
  };

  return qbank(createChildrenOptions)
  .then(() => {
    const promises = [];
    _.each(privateBankIds, (privateBankId) => {
      const addSharedBankToPrivateBankOptions = {
        method: 'POST',
        path: `assessment/hierarchies/nodes/${privateBankId}/children`,
        data: {
          ids: [sharedBankAlias(termBankId)]
        }
      };
      promises.push(qbank(addSharedBankToPrivateBankOptions));
    });
    return Q.all(promises);
  })
  .catch(() => {
    // console.log('error somewhere?', error)
  });
}

// utility method to get the sharedBankId for CRUD on shared missions...
function createSharedBank(bankId) {
  // create the shared mission bank with alias
  const createSharedBankOptions = {
    method: 'POST',
    path: 'assessment/banks',
    data: {
      name: 'Shared missions bank',
      description: `For all students in a class: ${bankId}`,
      genusTypeId: SHARED_MISSIONS_GENUS,
      aliasId: sharedBankAlias(bankId)
    }
  };

  return qbank(createSharedBankOptions)
  .then(newBank => (Q.when(JSON.parse(newBank))));
}

function linkSharedBankToTerm(sharedBankId, termBankId) {
  // append the shared bankId if it isn't already linked
  const sharedBankOptions = {
    path: `assessment/hierarchies/nodes/${termBankId}/children`
  };

  return qbank(sharedBankOptions)
  .then((result) => {
    const children = JSON.parse(result).data.results;
    if (children.length === 0 || !_.find(children, { genusTypeId: SHARED_MISSIONS_GENUS })) {
      const createChildrenOptions = {
        method: 'POST',
        path: `assessment/hierarchies/nodes/${termBankId}/children`,
        data: {
          ids: [sharedBankId]
        }
      };
      return qbank(createChildrenOptions);
    }
    return Q.when('shared bank is already a child');
  })
  .then(() => (Q.when('done')));
}

// utility method to get the sharedBankId for CRUD on shared missions...
function getSharedBankId(bankId) {
  // assume this is passed in as the termBankId
  const getSharedBankOptions = {
    path: `assessment/banks/${sharedBankAlias(bankId)}`
  };
  let sharedBank;
  return qbank(getSharedBankOptions)
  .then((result) => {
    sharedBank = JSON.parse(result);
    return Q.when(sharedBank.id);
  })
  .catch(() => (
    // shared bank may not exist
    Q.when(createSharedBank(bankId))
    .then((result) => {
      sharedBank = result;
      return Q.when(linkSharedBankToTerm(sharedBank.id, bankId));
    })
    .then(() => (Q.when(sharedBank.id)))
  ));
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
  // this method does NOT link the private bank into the hierarchy
  const privateBankAliasId = privateBankAlias(bankId, username);
  const privateBankTestOptions = {
    path: `assessment/banks/${privateBankAliasId}`
  };
  let privateBank = {};
  return qbank(privateBankTestOptions)
  .then((bank) => {
    privateBank = JSON.parse(bank);
    return Q.when(privateBank.id);
  })
  .catch(() => {
    // qbank(privateBankTestOptions) might throw a 500 if the private bank
    // doesn't exist -- so let's create the bank!
    // create the private bank and set authz
    const createPrivateBankOptions = {
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
    .then((newBank) => {
      privateBank = JSON.parse(newBank);
      return Q.when(addStudentAuthz(privateBank.id, username));
    })
    .then(() => (Q.when(privateBank.id)));
  });
}

// utility function to create a bank, add it as a node
// in a hierarchy
function getOrCreateChildNode(parentId, nodeName, nodeGenus, nodeDescription) {
  // don't need to proxy users when creating banks
  // Just check the bank children directly, because you might have
  //   multiple banks of "Spring 2017" for example...
  const getBankParams = {
    path: `assessment/hierarchies/nodes/${parentId}/children`
  };
  let newBank = {};
  return Q(qbank(getBankParams))
  .then((results) => {
    const children = JSON.parse(results);
    const match = _.find(children.data.results, child => (
      child.genusTypeId === nodeGenus && child.displayName.text === nodeName
    ));
    if (!match) {
      // create the bank and add it as a child node
      const createParams = {
        method: 'POST',
        path: 'assessment/banks',
        data: {
          genusTypeId: nodeGenus,
          name: nodeName,
          description: nodeDescription || 'FbW node'
        }
      };
      return Q(qbank(createParams));
    }
    // proceed with the match -- should be one
    newBank = match;
    return Q.reject(match);
  })
  .then((newBankData) => {
    // add as a hierarchy child
    newBank = JSON.parse(newBankData);
    const hierarchyParams = {
      path: `assessment/hierarchies/nodes/${parentId}/children`,
      method: 'POST',
      data: {
        ids: [newBank.id]
      }
    };
    return Q(qbank(hierarchyParams));
  })
  .then(() => (Q.when(newBank)), (err) => {
    // from http://stackoverflow.com/questions/29499582/how-to-properly-break-out-of-a-promise-chain#29505206
    if (err === newBank) {
      return Q.when(newBank);
    }
    return Q.reject();
  })
  .catch(() => {
    // console.log('error creating a child node');
  });
}

function aliasTerm(bankId, aliasId) {
  const aliasParams = {
    method: 'PUT',
    path: `assessment/banks/${bankId}`,
    data: {
      aliasId
    }
  };
  return qbank(aliasParams)
  .then(data => (Q.when(JSON.parse(data))))
  .catch(() => {
    // console.log('error aliasing a term');
  });
}

function setBankAlias(data) {
  // try to GET the alias first, to see if it already exists
  const params = {
    path: `assessment/banks/${data.aliasId}`
  };
  let newTerm = '';

  return qbank(params)
  .then(bankData => (
    // the bank already exists, so return it
    Q.when(JSON.parse(bankData))
  ))
  .catch(() => (
    // bank does not exist, create it -- first see if the
    // name exists, then we're just missing term.
    // Otherwise, create both bank and term.
    getOrCreateChildNode(data.bankId, data.departmentName, DEPARTMENT_GENUS)
    .then(departmentData => (
      // console.log('departmentData', departmentData)
      getOrCreateChildNode(departmentData.id, data.subjectName, SUBJECT_GENUS)
    ))
    .then(subjectData => (
      // console.log('subjectData', subjectData)
      getOrCreateChildNode(subjectData.id, data.subjectName, TERM_GENUS, data.termName)
    ))
    .then((termData) => {
      // console.log('termData', termData)
      newTerm = termData;
      return aliasTerm(termData.id, data.aliasId);
    })
    .then(() => (
      getSharedBankId(newTerm.id)
    ))
    .then(() => (
      Q.when(newTerm)
    ))
  ))
  .catch(() => {
    // console.log('error creating the nodes and aliases');
    // console.log(error);
  });
}

function privateBankAliasForUser(bankId, username) {
  return username ? privateBankAlias(bankId, username) : privateBankAlias(bankId, 'instructor');
}

// =========
// middleware simply for logging purposes
// router.use((req, res, next) => {
//   console.log('everything will go to ', credentials.qbank.Host,
//   'with secret=', credentials.qbank.SecretKey, 'with access_id=', credentials.qbank.AccessKeyId);
//   next();
// })
// =======

function getBanks(req, res) {
  // TODO: This needs to also include req.query params, when executing the
  // qbank call
  const queryParams = _.map(req.query, (val, key) => (
    `${key}=${val}`
  ));
  const options = {
    path: `assessment/banks?${queryParams.join('&')}`
  };

  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function createBank(req, res) {
  // create a D2L aliased bank in the right hierarchy...
  // Expects input to consist of:
  //   - a bankId, like ACC or QCC root nodeId
  //   - a departmentName, like algebra or accounting
  //   - a subjectName, like Accounting 101
  //   - a termName, like Spring 2017
  //   - an aliasId, like assessment.Bank%3A123456%40ACC.D2L.com
  // In turn, this will create the bank hierarchy within
  //   the school and set the D2L alias.
  //
  //   School
  //     |- Department
  //        |- Subject
  //           |- Term
  //              |- Shared bank
  // This returns the Term's bankId to the instructor app

  setBankAlias(req.body)
  .then(term => (res.send(term)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function editBankDetails(req, res) {
  // Edit a specific bank, i.e. to alias a D2L term ID
  const options = {
    data: req.body,
    method: 'PUT',
    path: `assessment/banks/${req.params.bankId}`
  };

  // do this async-ly
  qbank(options)
  .then(result => (
    res.send(result)
  ))
  .catch(err => (
    res.status(err.statusCode).send(err.message)
  ));
}

function deleteBank(req, res) {
  // delete a given bank and remove it from the hierarchy
  // need the original bankId, not privateBankAlias
  const options = {
    path: `assessment/hierarchies/nodes/${req.params.bankId}/parents`
  };
  // Todo: clean this up on the server-side to also have ?raw flag
  qbank(options)
  .then((parents) => {
    const originalParents = JSON.parse(parents).data.results;
    if (originalParents.length > 0) {
      const removeFromHierarchyOptions = {
        method: 'DELETE',
        data: {
          ids: _.map(originalParents, 'id')
        },
        path: `assessment/hierarchies/nodes/${req.params.bankId}/parents`
      };
      return qbank(removeFromHierarchyOptions);
    }
    return Q.when('');
  })
  .then(() => {
    // now remove from the children hierarchy too
    const childrenOptions = {
      method: 'PUT',
      data: { ids: [] },
      path: `assessment/hierarchies/nodes/${req.params.bankId}/children`
    };
    return qbank(childrenOptions);
  })
  .then(() => {
    const deleteOptions = {
      method: 'DELETE',
      path: `assessment/banks/${req.params.bankId}`
    };
    return qbank(deleteOptions);
  })
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getBankChildren(req, res) {
  // Gets you the children from the hierarchy service
  const options = {
    path: `assessment/hierarchies/nodes/${req.params.bankId}/children`
  };

  // do this async-ly
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getBankDetails(req, res) {
  // Gets you displayName and description of a specific bankId
  const options = {
    path: `assessment/banks/${req.params.bankId}/`
  };

  // do this async-ly
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getBankItems(req, res) {
  // Gets you all of the items in a bank
  const options = {
    path: `assessment/banks/${req.params.bankId}/items?raw`
  };

  // do this async-ly
  qbank(options)
  .then((result) => {
    let items = JSON.parse(result);
    // have to sort the choices, otherwise they'll be randomized here
    // could also do this via the &unrandomized flag in the request above,
    // but that adds server response time
    items = _.map(items, (item) => {
      const itemWithSortedChoices = _.assign({}, item);
      itemWithSortedChoices.question.choices = _.sortBy(itemWithSortedChoices.question.choices, 'name');
      return itemWithSortedChoices;
    });
    return res.send(items);             // this line sends back the response to the client
  })
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getMissionItems(req, res) {
  // Deprecated with the new LO-focused way to define the missions? Oct 25, 2016
  // Gets the items in a specific mission
  const options = {
    path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}/items?sections&page=all`
  };

  // do this async-ly
  qbank(options)
  .then((result) => {
    const items = JSON.parse(result);
    return res.send(items.data.results);
  })
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getMissionResults(req, res) {
  // Gets the student results for a specific offered. If authentication is
  // passed in, then filters by that agentId. Expects username as '@acc.edu'
  // Filtering by specific user is used for showing historical mission results on the
  // student app.
  const username = getUsername(req);
  let options;
  if (username) {
    options = {
      path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${req.params.offeredId}/results?agentId=${username}&raw`
    };
  } else {
    options = {
      path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${req.params.offeredId}/results?raw`
    };
  }

  // do this async-ly
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getPhase2Results(req, res) {
  // Gets the phase 2 student results for a specific offered.
  // It first gets all the takens, and then
  // Queries assessments by sourceAssessmentTakenId
  // And for each of those assessments, gets their one
  //   offered and then results for that offered
  // Returns an aggregated list, as getMissionResults does
  const options = {
    path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${req.params.offeredId}/spawnedresults?raw`
  };
  // do this async-ly
  qbank(options)
  .then(results => (res.send(results)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}


function getMissions(req, res) {
  // get assessments + offereds
  // For students with username, use the passed-in bank, which should
  //   be the termBankId. Calculate the privateBankAlias.
  // For instructors without username, the passed-in bank is the
  //   termBankId. Calculate the sharedBankId.
  const username = getUsername(req);
  let assessmentOptions;
  if (username) {
    // console.log('getMissions username exists', username);
    // console.log('private bank alias', privateBankAlias(req.params.bankId, username))
    assessmentOptions = {
      path: `assessment/banks/${privateBankAlias(req.params.bankId, username)}/assessments?raw&withOffereds`
    };
    // we don't actually need to set the proxy here, because
    // students can't see assessments in authz -- so still needs
    // to be FbW user. Just need a different filter.
  } else {
    // NOTE -- this assumes the privateBankAlias has already been set for instructor
    // use "sections" so can edit missions in the instructor app
    assessmentOptions = {
      path: `assessment/banks/${privateBankAlias(req.params.bankId, 'instructor')}/assessments?withOffereds&sections&raw&genusTypeId=${HOMEWORK_MISSION_GENUS}`
    };
  }

  // console.log('assessmentOptions', assessmentOptions)
  // do this async-ly
  qbank(assessmentOptions)
  .then((results) => {
    // these results should have the offereds included
    const assessments = JSON.parse(results);
    const updatedAssessments = [];
    _.each(assessments, (assessment) => {
      const updatedAssessment = _.assign({}, assessment);
      if (updatedAssessment.offereds.length > 0) {
        updatedAssessment.startTime = updatedAssessment.offereds[0].startTime;
        updatedAssessment.deadline = updatedAssessment.offereds[0].deadline;
        updatedAssessment.assessmentOfferedId = updatedAssessment.offereds[0].id;
      } else {
        // console.log("found an assessment with no offereds -- error??")
        updatedAssessment.startTime = {};
        updatedAssessment.deadline = {};
        updatedAssessment.assessmentOfferedId = null;
      }

      updatedAssessments.push(updatedAssessment);
    });
    return res.send(updatedAssessments);
  })
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function hasBasicAuthz(req, res) {
  // do authz check on basic QBank access
  const username = getUsername(req);
  const options = {
    path: `authorization/authorizations?agentId=${username}`
  };

  qbank(options)
  .then((authz) => {
    const numAuthz = JSON.parse(authz).data.count;

    if (numAuthz > 0) {
      return res.send('');
    }
    return res.status(403).send('');
  })
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getModules(req, res) {
  // Gets you all of the modules, for an objective bank
  const bankId = getHandcarBankId(req.params.contentLibraryId);
  const options = {
    path: `/learning/objectivebanks/${bankId}/objectives?genustypeid=mc3-objective%3Amc3.learning.topic%40MIT-OEIT`
  };

  // do this async-ly
  handcar(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getOutcomes(req, res) {
  // Gets you all of the outcomes, for an objective bank
  const bankId = getHandcarBankId(req.params.contentLibraryId);
  const options = {
    path: `/learning/objectivebanks/${bankId}/objectives?genustypeid=mc3-objective%3Amc3.learning.outcome%40MIT-OEIT`
  };
  // do this async-ly
  handcar(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getRelationships(req, res) {
  // Gets you all of the relationships for an objective bank
  //  NOte that this requires the familyId, which appears in the
  //  hardcoded handcar settings, on the client-side
  const familyId = getHandcarFamilyId(req.params.contentLibraryId);
  const options = {
    path: `/relationship/families/${familyId}/relationships?genustypeid=mc3-relationship%3Amc3.lo.2.lo.requisite%40MIT-OEIT&genustypeid=mc3-relationship%3Amc3.lo.2.lo.parent.child%40MIT-OEIT`
  };

  // do this async-ly
  handcar(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function addSharedMission(req, res) {
  // create assessment + offered
  // This is the endpoint for creating a shared mission that
  //   all students in the class need to take
  // It creates the mission in a child bank of
  //   genusTypeId: "assessment-bank-genus%3Afbw-shared-missions%40ODL.MIT.EDU"
  let assessment = {};
  const sharedBankAliasId = sharedBankAlias(req.params.bankId);
  const assessmentOptions = {
    data: req.body,
    method: 'POST',
    path: `assessment/banks/${sharedBankAliasId}/assessments`
  };
  // console.log('assessmentOptions', assessmentOptions)
  qbank(assessmentOptions)
  .then((result) => {
    assessment = JSON.parse(result);
    // now create the offered
    const offeredOption = {
      data: req.body,
      method: 'POST',
      path: `assessment/banks/${sharedBankAliasId}/assessments/${assessment.id}/assessmentsoffered`
    };
    // console.log('offeredOption', offeredOption)
    return qbank(offeredOption);
  })
  .then((result) => {
    const offered = JSON.parse(result);
    assessment.startTime = offered.startTime;
    assessment.deadline = offered.deadline;
    assessment.assessmentOfferedId = offered.id;
    // console.log('full assessment', assessment)
    return res.send(assessment);             // this line sends back the response to the client
  })
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getPrivateBankIdForUser(req, res) {
  // return the user's private bank, within the given bank
  // create it if necessary
  // BUT, if the privateBank already exists, assume
  //   the hierarchy and authz has been set...so just return the
  //   privateBankId
  const username = getUsername(req);
  const privateBankAliasId = privateBankAlias(req.params.bankId, username);
  let usersPrivateBankId;

  const options = {
    path: `assessment/banks/${privateBankAliasId}`
  };

  qbank(options)
  .then(privateBank => (res.send(JSON.parse(privateBank).id)))
  .catch(() => {
    Q.when(getPrivateBankId(req.params.bankId, username))
    .then((privateBankId) => {
      usersPrivateBankId = privateBankId;
      return Q.when(linkPrivateBanksIntoTerm([privateBankId], req.params.bankId));
    })
    .then(() => (Q.when(getSharedBankId(req.params.bankId))))
    .then(sharedBankId => (Q.when(addStudentAuthz(sharedBankId, username))))
    .then(() => (res.send(usersPrivateBankId)))
    .catch(err => (res.status(err.statusCode).send(err.message)));
  });
}

function addPersonalizedMission(req, res) {
  // create assessment + offered in a student's private bank, in bulk
  // This endpoint expects an array of student / section objects
  // This is the endpoint for creating a personalized mission that
  //   only a single student has authorization to take
  // It creates the mission in a child bank of
  //   genusTypeId: "assessment-bank-genus%3Afbw-private-missions%40ODL.MIT.EDU"

  let allPrivateBankIds = [];
  const privateBankPromises = [];

  _.each(req.body, (student) => {
    privateBankPromises.push(Q.when(getPrivateBankId(req.params.bankId, student.username)));
  });

  // console.log('privateBankPromises', privateBankPromises)

  Q.all(privateBankPromises)
  .then((privateBankIds) => {
    // then link the private banks into the term bank hierarchy so permissions
    // work out...
    allPrivateBankIds = privateBankIds;
    // console.log('allPrivateBankIds', privateBankIds)
    return Q.when(linkPrivateBanksIntoTerm(allPrivateBankIds, req.params.bankId));
  })
  .then(() => {
    // create the list of assessments, like
    //   {
    //     assessments:     [{
    //         bankId: 'assessment.Bank%3A123%40ODL.MIT.EDU',
    //         recordTypeIds': [''],
    //         name: 'Quiz 1',
    //         sections: [],
    //         assessmentsOffered: []
    //     }]
    //   }
    const createAssessmentsOptions = {
      path: 'assessment/bulkassessments',
      method: 'POST',
      data: {
        assessments: []
      }
    };
    _.each(allPrivateBankIds, (privateBankId, index) => {
      const assessmentData = req.body[index];
      const assessmentOptions = _.assign({}, assessmentData, {
        assessmentsOffered: [{
          startTime: assessmentData.startTime,
          deadline: assessmentData.deadline
        }],
        bankId: privateBankId
      });
      createAssessmentsOptions.data.assessments.push(assessmentOptions);
    });

    // console.log('createAssessmentsOptions', createAssessmentsOptions)
    return qbank(createAssessmentsOptions);
  })
  .then(allMissions => (res.send(allMissions)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function deleteMission(req, res) {
  // first, get all takens (we're assuming there is
  //    some sort of validation on the client-end, before
  //    calling this endpoint)
  // then delete assessment + offered

  // Keep this as the passed-in bankId (assuming termBankId),
  //   because otherwise it won't find all the takens to delete
  const getOfferedsOptions = {
    path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}/assessmentsoffered?raw`
  };
  let offeredIds;
  let deleteOfferedPromises;

  qbank(getOfferedsOptions)
  .then((offeredsRaw) => {
    const offereds = JSON.parse(offeredsRaw);
    offeredIds = _.map(offereds, 'id');
    // get takens
    // console.log('got offereds', offereds)
    return Q.all(_.map(offereds, offered => getTakens(offered.id, req.params.bankId)));
  })
  .then((takenResponses) => {
    // must delete takens first
    const takens = _.flatten(_.map(takenResponses, _.ary(JSON.parse, 1)));

    return Q.all(_.map(takens, taken => deleteTaken(taken.id, req.params.bankId)));
  })
  .then(() => {
    // then delete offereds
    deleteOfferedPromises = _.map(offeredIds,
      offeredId => deleteOffered(offeredId, req.params.bankId));

    return Q.all(deleteOfferedPromises);
  })
  .then(() => {
    // finally delete the assessment
    const assessmentOption = {
      method: 'DELETE',
      path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}`
    };
    return qbank(assessmentOption);
  })
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function deleteMissionTakens(req, res) {
  const getOfferedsOptions = {
    path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}/assessmentsoffered?raw`
  };

  qbank(getOfferedsOptions)
  .then((offeredsRaw) => {
    const offereds = JSON.parse(offeredsRaw);

    // get takens
    return Q.all(_.map(offereds, offered => getTakens(offered.id, req.params.bankId)));
  })
  .then((takenResponses) => {
    const takens = _.map(takenResponses, _.ary(JSON.parse, 1));
    const deleteTakenPromises = _.compact(_.map(takens,
      taken => deleteTaken(taken.id, req.params.bankId)));
    // console.log('takens', takens);
    // console.log('deleteTakenPromises', deleteTakenPromises);

    return deleteTakenPromises.length > 0 ? Q.all(deleteTakenPromises) : Q.when('no takens');
  })
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getMissionTakens(req, res) {
  const getOfferedOptions = {
    path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}/assessmentsoffered?raw`
  };

  qbank(getOfferedOptions)
  .then((result) => {
    const getTakenOptions = {
      path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${JSON.parse(result)[0].id}/assessmentstaken?raw`
    };
    return qbank(getTakenOptions);
  })
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function deleteSingleTaken(req, res) {
  const deleteTakenOptions = {
    method: 'DELETE',
    path: `assessment/banks/${req.params.bankId}/assessmentstaken/${req.params.takenId}`
  };

  qbank(deleteTakenOptions)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function editMission(req, res) {
  // used for editing the mission's hasSpawned, etc. for launching phase II
  // OR used to edit the mission questions / offered
  const inputData = req.body;

  if (inputData.startTime && inputData.deadline && inputData.assessmentOfferedId) {
    // edit an assessment, by adding / editing the parts within it
    // NOTE, this assumes that basically the ENTIRE mission is passed in,
    // as a bulk-replacement, i.e. the form on the UI side looks exactly
    // the same for Edit as it does for Add. All mission fields are required.
    const options = {
      data: inputData,
      method: 'PUT',
      path: `assessment/banks/${sharedBankAlias(req.params.bankId)}/assessments/${req.params.missionId}`
    };
    let updatedMission;

    qbank(options)
    .then((result) => {
      updatedMission = _.assign({}, JSON.parse(result));
      // edit the assessment offered, i.e. start date / deadline
      const editOfferedOptions = {
        data: {
          startTime: inputData.startTime,
          deadline: inputData.deadline
        },
        method: 'PUT',
        path: `assessment/banks/${req.params.bankId}/assessmentsoffered/${inputData.assessmentOfferedId}`
      };

      return qbank(editOfferedOptions);
    })
    .then((result) => {
      const offered = JSON.parse(result);
      updatedMission.startTime = offered.startTime;
      updatedMission.deadline = offered.deadline;
      updatedMission.assessmentOfferedId = offered.id;
      return res.send(updatedMission);
    })
    .catch(err => (res.status(err.statusCode).send(err.message)));
  } else {
    // just update the mission itself, without the offered / questions
    const options = {
      data: req.body,
      method: 'PUT',
      path: `assessment/banks/${sharedBankAlias(req.params.bankId)}/assessments/${req.params.missionId}`
    };
    qbank(options)
    .then(result => (res.send(result)))
    .catch(err => (res.status(err.statusCode).send(err.message)));
  }
}

function getMission(req, res) {
  // get an existing mission with its section info (for updating)
  // NOTE: this will NOT return the offereds
  const options = {
    path: `assessment/banks/${req.params.bankId}/assessments/${req.params.missionId}?sections`
  };
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function setAuthorizations(req, res) {
  // bulk-set the authorizations
  const options = {
    data: req.body,
    method: 'POST',
    path: 'authorization/authorizations'
  };

  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function deleteAuthorizations(req, res) {
  // bulk-delete the authorizations
  const username = getUsername(req);
  let options;

  if (username) {
    options = {
      method: 'DELETE',
      path: `authorization/authorizations?agentId=${username}`
    };
    qbank(options)
    .then(result => (res.send(result)))
    .catch(err => (res.status(err.statusCode).send(err.message)));
  } else {
    // no username, do nothing
    res.send('');
  }
}

function setMissionItems(req, res) {
  // Deprecated with the new LO-focused way to define the missions? Oct 25, 2016
  // Sets the items in a specific mission
  res.status(500).send('deprecated endpoint');
}

function getNodeChildren(req, res) {
  // Gets you the assessment bank hierarchy children for the given nodeId
  const options = {
    path: `assessment/hierarchies/nodes/${req.params.nodeId}/children`
  };

  // do this async-ly
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function setNodeChildren(req, res) {
  // Set the assessment bank hierarchy children for the given nodeId
  const options = {
    data: req.body,
    method: 'POST',
    path: `assessment/hierarchies/nodes/${req.params.nodeId}/children`
  };

  // do this async-ly
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getDepartmentLibraryId(req, res) {
  if (_.keys(domainMapping).indexOf(req.params.departmentName.toLowerCase()) >= 0) {
    return res.send(domainMapping[req.params.departmentName.toLowerCase()][0]);
  }
  return res.send('Unknown department');
}

function getDepartmentModules(req, res) {
  if (_.keys(domainMapping).indexOf(req.params.departmentName.toLowerCase()) >= 0) {
    const contentLibraryId = domainMapping[req.params.departmentName.toLowerCase()][0];
    const bankId = getHandcarBankId(contentLibraryId);
    const options = {
      path: `/learning/objectivebanks/${bankId}/objectives?genustypeid=mc3-objective%3Amc3.learning.topic%40MIT-OEIT`
    };

    // do this async-ly
    handcar(options)
    .then(result => (res.send(result)))
    .catch(err => (res.status(err.statusCode).send(err.message)));
  } else {
    res.send('Unknown department');
  }
}

function getDepartmentOutcomes(req, res) {
  if (_.keys(domainMapping).indexOf(req.params.departmentName.toLowerCase()) >= 0) {
    const contentLibraryId = domainMapping[req.params.departmentName.toLowerCase()][0];
    const bankId = getHandcarBankId(contentLibraryId);
    const options = {
      path: `/learning/objectivebanks/${bankId}/objectives?genustypeid=mc3-objective%3Amc3.learning.outcome%40MIT-OEIT`
    };
    // do this async-ly
    handcar(options)
    .then(result => (res.send(result)))
    .catch(err => (res.status(err.statusCode).send(err.message)));
  } else {
    res.send('Unknown department');
  }
}

function getDepartmentRelationships(req, res) {
  if (_.keys(domainMapping).indexOf(req.params.departmentName.toLowerCase()) >= 0) {
    const contentLibraryId = domainMapping[req.params.departmentName.toLowerCase()][0];
    const familyId = getHandcarFamilyId(contentLibraryId);
    const options = {
      path: `/relationship/families/${familyId}/relationships?genustypeid=mc3-relationship%3Amc3.lo.2.lo.requisite%40MIT-OEIT&genustypeid=mc3-relationship%3Amc3.lo.2.lo.parent.child%40MIT-OEIT`
    };

    // do this async-ly
    handcar(options)
    .then(result => (res.send(result)))
    .catch(err => (res.status(err.statusCode).send(err.message)));
  } else {
    res.send('Unknown department');
  }
}

function getUserMission(req, res) {
  // create assessment taken for the given user and get sections
  // user required.
  // This needs to be the user's privateBankId, for performance.
  //   All apps and tests need to send in the termBankId,
  //   and the middleman will calculate the privateBankAlias here
  const username = getUsername(req);
    // privateBankAliasId = sharedBankAlias(req.params.bankId),
  const privateBankAliasId = privateBankAliasForUser(req.params.bankId, username);
  const takenOptions = {
    path: `assessment/banks/${privateBankAliasId}/assessmentsoffered/${req.params.offeredId}/assessmentstaken`,
    method: 'POST',
    proxy: username
  };

    // console.log('username', username, 'takenOptions', takenOptions);
  qbank(takenOptions)
  .then((results) => {
    const taken = JSON.parse(results);
    const options = {
      path: `assessment/banks/${privateBankAliasId}/assessmentstaken/${taken.id}/questions?raw`,
      proxy: username
    };
    return qbank(options);
  })
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getSectionQuestions(req, res) {
  // get user's questions for a specific section
  // user required.
  const username = getUsername(req);
  const privateBankAliasId = privateBankAliasForUser(req.params.bankId, username);
  const takenOptions = {
    path: `assessment/banks/${privateBankAliasId}/assessmentsections/${req.params.sectionId}/questions?raw`,
    proxy: username
  };

  qbank(takenOptions)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getWorkedSolution(req, res) {
  // Give up on a specific question and get the worked solution
  // Requires authentication header
  const username = getUsername(req);
  const privateBankAliasId = privateBankAliasForUser(req.params.bankId, username);
  const options = {
    path: `assessment/banks/${privateBankAliasId}/assessmentstaken/${req.params.takenId}/questions/${req.params.questionId}/surrender`,
    proxy: username,
    method: 'POST'
  };

  // do this async-ly
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function submitAnswer(req, res) {
  // Send student response to the server
  // Requires authentication header
  const username = getUsername(req);
  const privateBankAliasId = privateBankAliasForUser(req.params.bankId, username);
  const options = {
    path: `assessment/banks/${privateBankAliasId}/assessmentstaken/${req.params.takenId}/questions/${req.params.questionId}/submit`,
    proxy: username,
    method: 'POST',
    data: req.body
  };

  // do this async-ly
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.status(err.statusCode).send(err.message)));
}

function getAssetCloudFrontUrl(req, res) {
  // get an image's CloudFront URL and return it
  const options = {
    path: `repository/repositories/${req.params.repositoryId}/assets/${req.params.assetId}/url`,
    followRedirect: false
  };

  // do this async-ly
  qbank(options)
  .then(result => (res.send(result)))
  .catch(err => (res.send(err.response.headers.location)));
}

// so the full path for this endpoint is /middleman/...
router.delete('/authorizations', deleteAuthorizations);
router.post('/authorizations', setAuthorizations);
router.get('/hasbasicauthz', hasBasicAuthz);
router.get('/banks', getBanks);
router.post('/banks', createBank);
router.get('/banks/:bankId', getBankDetails);
router.put('/banks/:bankId', editBankDetails);
router.delete('/banks/:bankId', deleteBank);
router.get('/banks/:bankId/children', getBankChildren);
router.get('/banks/:bankId/items', getBankItems);
router.get('/banks/:bankId/missions', getMissions);
router.post('/banks/:bankId/missions', addSharedMission);
router.post('/banks/:bankId/personalmissions', addPersonalizedMission);
router.get('/banks/:bankId/privatebankid', getPrivateBankIdForUser);
router.get('/banks/:bankId/missions/:missionId', getMission);
router.delete('/banks/:bankId/missions/:missionId', deleteMission);
router.get('/banks/:bankId/missions/:missionId/takens', getMissionTakens);  // for cleaning up
router.delete('/banks/:bankId/missions/:missionId/takens', deleteMissionTakens);
router.delete('/banks/:bankId/missions/:missionId/takens/:takenId', deleteSingleTaken);  // for cleaning up
router.put('/banks/:bankId/missions/:missionId', editMission);

router.get('/banks/:bankId/missions/:missionId/items', getMissionItems);      // deprecated?
router.put('/banks/:bankId/missions/:missionId/items', setMissionItems);      // deprecated?

router.get('/banks/:bankId/offereds/:offeredId/results', getMissionResults);
router.get('/banks/:bankId/offereds/:offeredId/p2results', getPhase2Results);
router.get('/banks/:bankId/offereds/:offeredId/takeMission', getUserMission);
router.get('/banks/:bankId/sections/:sectionId/questions', getSectionQuestions);
router.post('/banks/:bankId/takens/:takenId/questions/:questionId/surrender', getWorkedSolution);
router.post('/banks/:bankId/takens/:takenId/questions/:questionId/submit', submitAnswer);

router.get('/departments/:departmentName/library', getDepartmentLibraryId);
router.get('/departments/:departmentName/modules', getDepartmentModules);
router.get('/departments/:departmentName/outcomes', getDepartmentOutcomes);
router.get('/departments/:departmentName/relationships', getDepartmentRelationships);
router.get('/repositories/:repositoryId/assets/:assetId/url', getAssetCloudFrontUrl);
router.get('/hierarchies/:nodeId/children', getNodeChildren);
router.post('/hierarchies/:nodeId/children', setNodeChildren);
router.get('/objectivebanks/:contentLibraryId/modules', getModules);
router.get('/objectivebanks/:contentLibraryId/outcomes', getOutcomes);
router.get('/objectivebanks/:contentLibraryId/relationships', getRelationships);


module.exports = router;
