
process.env.NODE_ENV = 'production';
process.env.PORT = 5001;

import prodCredentials from '../../credentials/_prod.credentials.js'
process.env.PROD_QBANK_SECRET = prodCredentials.qbank.SecretKey
process.env.PROD_QBANK_ACCESS_ID = prodCredentials.qbank.AccessKeyId
process.env.PROD_QBANK_HOST = prodCredentials.qbank.Host

// const env = require('./environment');
const Q = require('q')
if (!global.Promise) {
  global.Promise = require('q');
}
const chai = require('chai');
const chaiHttp = require('chai-http');
const moment = require('moment')
const server = require('../../index');
const should = chai.should();
const _ = require('lodash')
const utilities = require('./utilities')

chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';
const ACCOUNTING_BANK_ID = 'assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU';

const ASSIGNED_BANK_ID = "assessment.Bank%3A581a39cd71e4822fa62c96cd%40bazzim.MIT.EDU";
const OFFERED_ID = "assessment.AssessmentOffered%3A5855473871e4823bce25a7fd%40bazzim.MIT.EDU";    // the internal test mission
const SECTION_ID = "assessment.AssessmentSection%3A5855518171e4823bce25aa7f%40bazzim.MIT.EDU";    // the first directive: if two lines are parallel

const STUDENT_ID = 'LUWEEZY@fbw-visitor.edu'
const INSTRUCTOR_ID = 'I5055010092@fbw-visitor.edu'

const STUDENTS = [
  {
    agentId: 'LUWEEZY@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DARTH_VADER@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'YODA@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DAX@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'JANEWAY@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'PICARD@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'SPOCK@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'WORF@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DATA@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'TUVOK@fbw-visitor.edu',
    takenId: 'a random string'
  },
];

const directives = [
  {
    id: 'mc3-objective%3A15206%40MIT-OEIT'    // add/subtract/multiply 2 functions
  },
  {
    id: 'mc3-objective%3A15143%40MIT-OEIT'    // decompose a function
  },
  {
    id: 'mc3-objective%3A14229%40MIT-OEIT'    // find center and radius of circle
  },
  {
    id: 'mc3-objective%3A15027%40MIT-OEIT',   // find midpoint of segement
  },
  {
    id: 'mc3-objective%3A15119%40MIT-OEIT'  // find the zero of linear funciton
  },
  {
    id: 'mc3-objective%3A15115%40MIT-OEIT'    // solve linear equ
  },
  {
    id: 'mc3-objective%3A15058%40MIT-OEIT'    // find eqn of line given two points
  },
  {
    id: 'mc3-objective%3A14239%40MIT-OEIT'      // find the equation of line from its graph
  }
];

const directivesItemsMap = {
  'mc3-objective%3A15059%40MIT-OEIT': 6,
  'mc3-objective%3A15062%40MIT-OEIT': 6,
  'mc3-objective%3A15206%40MIT-OEIT': 6,
  'mc3-objective%3A15143%40MIT-OEIT': 3,
  'mc3-objective%3A14229%40MIT-OEIT': 6,
  'mc3-objective%3A15027%40MIT-OEIT': 6,
  'mc3-objective%3A15119%40MIT-OEIT': 6,
  'mc3-objective%3A15115%40MIT-OEIT': 6,
  'mc3-objective%3A15058%40MIT-OEIT': 6,
  'mc3-objective%3A14239%40MIT-OEIT': 6,
}

const NOW_SECS = new Date().getTime()
const UNIQUE_USERNAMES = []
const NUM_NEW_STUDENTS = 15

_.each(_.range(NUM_NEW_STUDENTS), (inc) => {
  UNIQUE_USERNAMES.push(Math.floor(NOW_SECS + inc).toString())
})
const FAKE_SCHOOL = "testing"

const NEW_STUDENTS = _.map(UNIQUE_USERNAMES, (username) => {
  return {
    agentId: `${username}@${FAKE_SCHOOL}.edu`,
    takenId: 'a random string'
  }
})

let PRIVATE_BANK_IDS = []

function interactionTimeout() {
  return _.random(1000, 1000*3)
}


describe('Instructor getting results', function() {
  this.timeout(6000000)

  it(`should get results on the Internal Test Mission (Phase I)`, done => {
    chai.request(server)
   .get(`/middleman/banks/${ALGEBRA_BANK_ID}/offereds/${OFFERED_ID}/results`)
   .end((err, res) => {
     res.should.have.status(200);
     let result = JSON.parse(res.text);
     result.length.should.be.above(1);        // there's 1 taken just from testing alone + possibly a bunch of others
    //  console.log(result);

     done();
   });
  });

  function setBasicAuthz(username) {
    let deferred = Q.defer();

    setTimeout(() => {
      chai.request(server)
      .post(`/middleman/authorizations`)
      .send({
        bulk: utilities.authz(username)
      })
      .then((res) => {
        deferred.resolve(res)
      })
    }, interactionTimeout())

    return deferred.promise
  }

  it (`should create Phase II missions for the Internal Test Mission `, done => {
    let phaseIIMissions = _.map(STUDENTS, student => {
      let data = {
        student,
        displayName: 'Internal Test mission'
      };

      // this says that all students listed will get the same directives
      return utilities.createMission(data, 'phaseII', directives, directivesItemsMap)
    });

    // now let's add in some new students, who were not in the original
    // like D2L class Roster action
    phaseIIMissions = _.concat(phaseIIMissions, _.map(NEW_STUDENTS, student => {
      let data = {
        student,
        displayName: 'Internal Test mission'
      };

      return utilities.createMission(data, 'phaseII', directives, directivesItemsMap)
    }))
    // console.log('phase II missions', phaseIIMissions)

    // then have to create the authz for these new students
    // In the real workflow, this happens in a backwards fashion, where
    //   the phase II mission + privateBank + privateAuthz is created first,
    //   then the new students
    //   will log in, creating their basic authz, so let's model that here.
    chai.request(server)
    .post(`/middleman/banks/${ALGEBRA_BANK_ID}/personalmissions`)
    .send(phaseIIMissions)
    .then((res) => {
      res.should.have.status(200);

      let result = JSON.parse(res.text);
      result.length.should.be.eql(STUDENTS.length + NEW_STUDENTS.length);
      // console.log('result', result);

      // now let's create basic authz for all the new students,
      // so they can log in and take in the next step
      return Q.all(_.map(NEW_STUDENTS, (student) => {
        return setBasicAuthz(student.agentId)
      }))
    })
    .then((results) => {
      results.length.should.be.eql(NEW_STUDENTS.length)

      // get the private banks
      return Q.all(_.map(NEW_STUDENTS, (student) => {
        return chai.request(server)
        .get(`/middleman/banks/${utilities.generatePrivateAlias(student.agentId)}`)
      }))
    })
    .then((results) => {
      PRIVATE_BANK_IDS = _.map(results, (result) => {
        return JSON.parse(result.text).id
      })
      done();
    })
    .catch((err) => {
      console.log(err)
    });
  });

  function takeMissionPromise(offeredId, student) {
    let deferred = Q.defer();
    let randomTimeout = interactionTimeout()

    setTimeout(() => {
      chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/offereds/${offeredId}/takeMission`)
      .set('x-fbw-username', student.agentId)
      .then((res) => {
        deferred.resolve(res)
        return res
      })
    }, randomTimeout)

    return deferred.promise
  }

  function submitResponsePromise(sectionId, questionId, choiceId, student) {
    let deferred = Q.defer();
    let randomTimeout = interactionTimeout()

    setTimeout(() => {
      chai.request(server)
      .post(`/middleman/banks/${ALGEBRA_BANK_ID}/takens/${sectionId}/questions/${questionId}/submit`)
      .set('x-fbw-username', student.agentId)
      .send({
        choiceIds: [choiceId],
        type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
      })
      .then((res) => {
        deferred.resolve(res)
        return res
      })
    }, randomTimeout)

    return deferred.promise
  }

  function getOfferedTakenPromise(student) {
    // this executes only after a random timeout between 500 milliseconds and 2 seconds
    let deferred = Q.defer();
    let randomTimeout = interactionTimeout()

    setTimeout(() => {
      console.log('getting offered + taken for', student.agentId, 'after', randomTimeout)

      chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
      .set('x-fbw-username', student.agentId)
      .then( (res) => {
        res.should.have.status(200);

        let result = JSON.parse(res.text);
        let phaseIIs = _.filter(result, mission => mission.displayName.text.indexOf('Phase II') > -1);
        // console.log('all missions', result)
        // console.log('phaseIIs', phaseIIs);

        phaseIIs.length.should.be.eql(1);           // since we do cleanup for everyone, there should only be 1 mission

        let offereds = phaseIIs[0].offereds;
        let assignedBankIds = phaseIIs[0].assignedBankIds;

        // console.log('offereds', offereds))
        // console.log('offereds length', offereds.length)
        // console.log('assignedBankIds', assignedBankIds)

        offereds.length.should.be.eql(1);
        assignedBankIds.length.should.be.eql(1);
        return takeMissionPromise(offereds[0].id, student)
      })
      .then( res => {
        let result = JSON.parse(res.text);
        // console.log('got taken', result);
        // this should return a list of sections
        result.length.should.eql(directives.length);     // 14 directives

        // let's try answering one
        let sectionId = result[0].id
        let questionId = result[0].questions[0].id
        let choiceId = result[0].questions[0].choices[0].id

        return submitResponsePromise(sectionId, questionId, choiceId, student)
      })
      .then((result) => {
        result.should.have.status(200)

        deferred.resolve(result);

        return result;
      });
    }, randomTimeout);

    return deferred.promise;
  }


  it(`should verify that all students can get the offered id and take their own Phase II mission`, function(done) {
    this.timeout(600000)
    let allStudents = _.concat(STUDENTS, NEW_STUDENTS)
    Q.all(_.map(allStudents, getOfferedTakenPromise))
    .then( res => {
      // console.log('got offereds + takens for all students', res)
      done();
    })

  })


  function deleteMissionAsync(missionId) {
    return chai.request(server)
     .delete(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${missionId}`)
     .then((res) => {
      //  console.log('delete res', res.text)
       return res.text ? JSON.parse(res.text) : null;
     });
  }

  function cleanUpPromise(student) {
    console.log('cleaning up for', student.agentId);

    return chai.request(server)
    .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
    .set('x-fbw-username', student.agentId)
    .then( (res) => {
      res.should.have.status(200);

      let result = JSON.parse(res.text);
      let phaseIIs = _.filter(result, mission => mission.displayName.text.indexOf('Phase II') > -1 || mission.offereds.length == 0);
      // console.log('all missions', result);
      // console.log(result[0].displayName);

      // console.log('missions to be deleted', _.map(phaseIIs, 'displayName.text'));

      return Q.all(_.map(phaseIIs, mission => deleteMissionAsync(mission.id)))
    })
    .then( res => res)
    .catch( err => err);
  }

  // clean up all the newly-created Phase II missions and early cruft with no offereds
  after( function(done) {
    this.timeout(30000);

    Q.all(_.map(STUDENTS, cleanUpPromise))
    .then( res => {
      console.log("also delete the phase II's for the new / random students")
      return Q.all(_.map(NEW_STUDENTS, cleanUpPromise))
    })
    .then( res => {
      console.log('delete the new student private banks')
      return Q.all(_.map(PRIVATE_BANK_IDS, (bankId) => {
        return chai.request(server)
        .delete(`/middleman/banks/${bankId}`)
      }))
    })
    .then( res => {
      console.log('delete the new student authz')
      return Q.all(_.map(NEW_STUDENTS, (student) => {
        return chai.request(server)
        .delete(`/middleman/authorizations`)
        .set('x-fbw-username', student.agentId)
      }))
    })
    .then( res => {
      console.log('cleaned up for all students', res.text);
      process.env.PROD_QBANK_SECRET = null
      process.env.PROD_QBANK_ACCESS_ID = null
      process.env.PROD_QBANK_HOST = null
      done();
    })
  });



});
