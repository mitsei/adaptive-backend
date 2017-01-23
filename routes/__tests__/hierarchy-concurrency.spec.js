
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

// const env = require('./environment');

const chai = require('chai');
const chaiHttp = require('chai-http');
const moment = require('moment')
const server = require('../../index');
const should = chai.should();
const _ = require('lodash')
const Q = require('q')
// const utils = require('')

chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';
const ACCOUNTING_BANK_ID = 'assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU';

const OFFERED_ID = "assessment.AssessmentOffered%3A5855473871e4823bce25a7fd%40bazzim.MIT.EDU";    // the internal test mission
const SECTION_ID = "assessment.AssessmentSection%3A5855518171e4823bce25aa7f%40bazzim.MIT.EDU";    // the first directive: if two lines are parallel

const WRONG_QUESTION_ID = "assessment.Item%3A5855518571e4823bce25aa8f%40assessment-session";
const WRONG_CHOICE_ID = "583f570271e482974e517c72";

const CORRECT_QUESTION_ID = "assessment.Item%3A5855518471e4823bce25aa8d%40assessment-session";
const CORRECT_CHOICE_ID = "582f1e5571e4822a2a0589d0";


const UNIQUE_USERNAME_1 = Math.floor(new Date().getTime()).toString()
const UNIQUE_USERNAME_2 = Math.floor(new Date().getTime() + 1).toString()
const FAKE_SCHOOL = "testing"
const LOGGED_IN_USERNAME_1 = `${UNIQUE_USERNAME_1}@${FAKE_SCHOOL}.edu`
const LOGGED_IN_USERNAME_2 = `${UNIQUE_USERNAME_2}@${FAKE_SCHOOL}.edu`

const STUDENTS = [LOGGED_IN_USERNAME_1, LOGGED_IN_USERNAME_2]

const PRIVATE_BANK_ALIASES = {}

PRIVATE_BANK_ALIASES[LOGGED_IN_USERNAME_1] = `assessment.Bank%3A576d6d3271e4828c441d721a-${UNIQUE_USERNAME_1}.${FAKE_SCHOOL}.edu%40ODL.MIT.EDU`
PRIVATE_BANK_ALIASES[LOGGED_IN_USERNAME_2] = `assessment.Bank%3A576d6d3271e4828c441d721a-${UNIQUE_USERNAME_2}.${FAKE_SCHOOL}.edu%40ODL.MIT.EDU`

let PRIVATE_BANK_IDS = []
let TEST_MISSIONS = {}  // used for cleaning up
let TEST_SECTIONS = []
let MAPPED_AUTHZ = []

import AUTHORIZATIONS from './_sampleAuthorizations'


function privateBankAlias(username) {
  return PRIVATE_BANK_ALIASES[username]
}

function authz(username) {
  return _.map(AUTHORIZATIONS, (authorization) => {
    let newAuthz = _.assign({}, authorization)
    newAuthz.agentId = username
    return newAuthz
  })
}

function dblEncodedUsername(username) {
  return encodeURIComponent(encodeURIComponent(username))
}


describe('multiple new students interacting', function() {

  let questionId;

  it(`should each get different private banks`, done => {
    _.each(STUDENTS, (username, index) => {
      MAPPED_AUTHZ[index] = _.assign([], authz(username));
    })
    // set up basic authz first, before calling /privatebankid
    Q.all(_.map(STUDENTS, (username, index) => {
      return chai.request(server)
      .post(`/middleman/authorizations`)
      .send({
        bulk: MAPPED_AUTHZ[index]
      })
    }))
    .then((results) => {
      _.each(results, (result, index) => {
        let newUserAuthz = JSON.parse(result.text)
        newUserAuthz[0].agentId.should.include(dblEncodedUsername(STUDENTS[index]))
      })

      // now get privateBankIds
      return Q.all(_.map(STUDENTS, (username) => {
        return chai.request(server)
        .get(`/middleman/banks/${ALGEBRA_BANK_ID}/privatebankid`)
        .set('x-fbw-username', username)
      }))
    })
    .then((results) => {
      results.length.should.be.eql(2)
      // save the private banks to assert IDs are equal, later
      _.each(results, (res) => {
        PRIVATE_BANK_IDS.push(res.text)
      })

      PRIVATE_BANK_IDS.length.should.be.eql(2)
      PRIVATE_BANK_IDS[0].should.not.be.eql(PRIVATE_BANK_IDS[1])

      return Q.all(_.map(STUDENTS, (username) => {
        return chai.request(server)
        .get(`/middleman/banks/${privateBankAlias(username)}`)
      }))
    })
    .then((results) => {
      results.length.should.be.eql(2)
      _.each(results, (res, index) => {
        JSON.parse(res.text).id.should.be.eql(PRIVATE_BANK_IDS[index])
      })

      done()
    })
    .catch((err) => {
      console.log(err)
    })
  });

  it(`should each be able to see the shared missions`, done => {
    Q.all(_.map(STUDENTS, (username) => {
      return chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
      .set('x-fbw-username', username)
    }))
    .then((results) => {
      _.each(results, (res, index) => {
        let missions = JSON.parse(res.text)
        missions.length.should.eql(6);
        TEST_MISSIONS[STUDENTS[index]] = _.find(missions, {assessmentOfferedId: OFFERED_ID})
      })
     done();
   })
   .catch((err) => {
     console.log(err)
   })
 })

 it(`should each be able to get questions for a shared mission`, done => {
   Q.all(_.map(STUDENTS, (username) => {
     return chai.request(server)
       .get(`/middleman/banks/${ALGEBRA_BANK_ID}/offereds/${OFFERED_ID}/takeMission`)
       .set('x-fbw-username', username)
   }))
   .then((results) => {
     _.each(results, (result) => {
       result.should.have.status(200)
       TEST_SECTIONS.push(JSON.parse(result.text)[0])
     })
     done()
   })
   .catch((err) => {
     console.log(err)
   })
  });

  it(`should each be able to submit response for a shared mission`, done => {
    Q.all(_.map(STUDENTS, (username, index) => {
      let section = TEST_SECTIONS[index]
      let sectionId = section.id
      let questionId = section.questions[0].id
      let choiceId = section.questions[0].choices[0].id
      return chai.request(server)
        .post(`/middleman/banks/${ALGEBRA_BANK_ID}/takens/${sectionId}/questions/${questionId}/submit`)
        .set('x-fbw-username', username)
        .send({
          choiceIds: [choiceId],
          type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
        })

    }))
    .then((results) => {
      _.each(results, (result) => {
        result.should.have.status(200)
      })
      done()
    })
    .catch((err) => {
      console.log(err)
    })
   });

  function cleanUpPromise(username) {
    console.log('cleaning up for', username);
    let privateBank
    // to clean up, need to grab the actual private bank id
    return chai.request(server)
    .get(`/middleman/banks/${privateBankAlias(username)}`)
    .then((res) => {
      res.should.have.status(200);
      privateBank = JSON.parse(res.text)

      // then delete just this user's taken...
      return chai.request(server)
      .get(`/middleman/banks/${privateBank.id}/missions/${TEST_MISSIONS[username].id}/takens`)
    })
    .then((res) => {
      res.should.have.status(200)
      let takens = JSON.parse(res.text)
      let myTaken = _.find(takens, (taken) => {
        return taken.takingAgentId.indexOf(dblEncodedUsername(username)) >= 0;
      })
      return chai.request(server)
      .delete(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${TEST_MISSIONS[username].id}/takens/${myTaken.id}`)
    })
    .then((res) => {
      return chai.request(server)
      .delete(`/middleman/banks/${privateBank.id}`)
    })
    .then( (res) => {
      res.should.have.status(200);

      return chai.request(server)
      .delete(`/middleman/authorizations`)
      .set('x-fbw-username', username)
    })
    .then( (res) => {
      res.should.have.status(200)
      return Q.when('')
    })
    .catch( (err) => {
      console.log(err)
    });
  }

  // clean up all the newly-created authorizations, banks, and missions
  after( function(done) {
    this.timeout(20000);

    Q.all(_.map(STUDENTS, cleanUpPromise))
    .then( res => {
      console.log('cleaned up for all newly created students');

      done();
    })
  })
});
