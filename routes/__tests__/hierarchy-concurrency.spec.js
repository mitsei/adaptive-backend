
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

const STUDENT_ID = 'LUWEEZY@fbw-visitor.edu'
const PRIVATE_ALGEBRA_BANK_ID = 'assessment.Bank%3A5850599e71e4824fcc9d345f%40bazzim.MIT.EDU'
const ASSIGNED_BANK_ID = "assessment.Bank%3A581a39cd71e4822fa62c96cd%40bazzim.MIT.EDU";
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

PRIVATE_BANK_ALIASES[LOGGED_IN_USERNAME_1] = `assessment.Bank%3A58498ccb71e482e47e0ed8ce-${UNIQUE_USERNAME_1}.${FAKE_SCHOOL}.edu%40ODL.MIT.EDU`
PRIVATE_BANK_ALIASES[LOGGED_IN_USERNAME_2] = `assessment.Bank%3A58498ccb71e482e47e0ed8ce-${UNIQUE_USERNAME_2}.${FAKE_SCHOOL}.edu%40ODL.MIT.EDU`

let PRIVATE_BANK_IDS = []

import AUTHORIZATIONS from './_sampleAuthorizations'


function privateBank(username) {
  return PRIVATE_BANK_ALIASES[username]
}

function authz(username) {
  return _.map(AUTHORIZATIONS, (authorization) => {
    authorization.takingAgentId = username
    return authorization
  })
}


describe('multiple new students interacting', function() {

  let questionId;

  it(`should each get different private banks`, done => {

    // set up basic authz first, before calling /privatebankid
    Q.all(_.map(STUDENTS, (username) => {
      return chai.request(server)
     .post(`/middleman/authorizations`)
     .send({
       bulk: authz(username)
     })
    }))
    .then((res) => {
      // now get privateBankIds
      return Q.all(_.map(STUDENTS, (username) => {
        return chai.request(server)
        .get(`/middleman/banks/${ALGEBRA_BANK_ID}/privatebankid`)
        .set('x-fbw-username', username)
      }))
    })
    .then((results) => {
      // save the private banks to assert IDs are equal, later
      _.each(results, (res) => {
        PRIVATE_BANK_IDS.push(res.text)
      })

      PRIVATE_BANK_IDS.length.should.be.eql(2)
      PRIVATE_BANK_IDS[0].should.not.be.eql(PRIVATE_BANK_IDS[1])

      return Q.all(_.map(STUDENTS, (username) => {
        return chai.request(server)
        .get(`/middleman/banks/${privateBank(username)}/missions`)
        .set('x-fbw-username', username)
      }))
    })
    .then((results) => {
      _.each(results, (res, index) => {
        JSON.parse(res).id.should.be.eql(PRIVATE_BANK_IDS[index])
      })

      done()
    })
    .catch((err) => {
      console.log(err)
    })
  });

  // it(`should each be able to see the shared missions`, done => {
  //   chai.request(server)
  //  .get(`/middleman/banks/${ALGEBRA_BANK_ID}/offereds/${OFFERED_ID}/takeMission`)
  //  .set('x-fbw-username', STUDENT_ID)
  //  .end((err, res) => {
  //    res.should.have.status(200);
  //    let result = JSON.parse(res.text);
  //
  //    result.length.should.eql(14);     // 14 directives
  //    let section = result[0];
  //
  //   //  console.log('section', section);
  //
  //    done();
  // })
  //
  //
  // it(`should each be able to get questions for a shared mission`, done => {
  //   chai.request(server)
  //  .post(`/middleman/banks/${ALGEBRA_BANK_ID}/takens/${SECTION_ID}/questions/${WRONG_QUESTION_ID}/submit`)
  //  .set('x-fbw-username', STUDENT_ID)
  //  .send({
  //    choiceIds: [WRONG_CHOICE_ID],
  //    type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
  //  })
  //  .end((err, res) => {
  //    res.should.have.status(200);
  //
  //    let result = JSON.parse(res.text);
  //   //  console.log('wrong result', result);
  //    result.isCorrect.should.eql(false);
  //    // we answered incorrectly on the 3rd Target, so next Question should be waypoint with 3.1 magic numbering
  //    result.nextQuestion.displayName.text.should.eql('3.1');
  //
  //    done();
  //  });
  // });
  //
  // it(`should submit the correct answer on the 1st Target quesiton for ${STUDENT_ID}`, done => {
  //   chai.request(server)
  //  .post(`/middleman/banks/${ALGEBRA_BANK_ID}/takens/${SECTION_ID}/questions/${CORRECT_QUESTION_ID}/submit`)
  //  .set('x-fbw-username', STUDENT_ID)
  //  .send({
  //    choiceIds: [CORRECT_CHOICE_ID],
  //    type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
  //  })
  //  .end((err, res) => {
  //    res.should.have.status(200);
  //
  //    let result = JSON.parse(res.text);
  //    result.isCorrect.should.eql(true);
  //    result.nextQuestion.displayName.text.should.eql('2');      // we answered correctly on the 1st Target
  //   //  console.log('correct result', result);
  //
  //    done();
  //  });
  // });

  function cleanUpPromise(username) {
    console.log('cleaning up for', username);
    let privateBank
    // to clean up, need to grab the actual private bank id
    return chai.request(server)
    .get(`/middleman/banks/${privateBank(username)}`)
    .then((res) => {
      res.should.have.status(200);
      privateBank = JSON.parse(res.text)
      return chai.request(BASE_URL)
      .get(`/middleman/banks/${privateBank.id}/missions`)
      .set('x-fbw-username', username)
    })
    .then((res) => {
      res.should.have.status(200)
      let missions = JSON.parse(res.text)
      return chai.request(BASE_URL)
      .delete(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${missions[0].id}`)
    })
    .then((res) => {
      return chai.request(BASE_URL)
      .delete(`/middleman/banks/${privateBank.id}`)
    })
    .then( (res) => {
      res.should.have.status(200);

      return chai.request(BASE_URL)
      .delete(`/middleman/authorizations`)
      .set('x-fbw-username', username)
    })
    .then( (res) => {
      res.should.have.status(200)
      return Q.when('')
    })
    .catch( err => err);
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
