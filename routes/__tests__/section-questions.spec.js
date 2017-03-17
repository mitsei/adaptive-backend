
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

// const env = require('./environment');

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../index');
const utilities = require('./utilities');
const Q = require('q');
const _ = require('lodash');

chai.should();
chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';

const FAKE_SCHOOL = 'testing';
const NOW_SECS = new Date().getTime();
const STUDENT_ID = `${Math.floor(NOW_SECS).toString()}@${FAKE_SCHOOL}.edu`;
const MISSION_ID = 'assessment.Assessment%3A5855473771e4823bce25a7c4%40bazzim.MIT.EDU';
const OFFERED_ID = 'assessment.AssessmentOffered%3A5855473871e4823bce25a7fd%40bazzim.MIT.EDU';    // the internal test mission

let SECTION_ID;

function dblEncodedUsername(username) {
  return encodeURIComponent(encodeURIComponent(username));
}

describe('a new student', () => {
  function setBasicAuthz(username) {
    const deferred = Q.defer();

    chai.request(server)
    .post('/middleman/authorizations')
    .send({
      bulk: utilities.authz(username)
    })
    .then((res) => {
      deferred.resolve(res);
    });

    return deferred.promise;
  }

  function getPrivateBankId(username) {
    // This is the critical method to test, which modifies the
    // hierarchy. So the random timeouts here is most important.
    const deferred = Q.defer();

    chai.request(server)
    .get(`/middleman/banks/${ALGEBRA_BANK_ID}/privatebankid`)
    .set('x-fbw-username', username)
    .then((res) => {
      deferred.resolve(res);
    });

    return deferred.promise;
  }

  before(() => (
    setBasicAuthz(STUDENT_ID)
    .then(() => (getPrivateBankId(STUDENT_ID)))
  ));

  it(`should get a taken with sections only for ${STUDENT_ID}`, (done) => {
    chai.request(server)
    .get(`/middleman/banks/${ALGEBRA_BANK_ID}/offereds/${OFFERED_ID}/takeMission?sectionsOnly=true`)
    .set('x-fbw-username', STUDENT_ID)
    .end((err, res) => {
      res.should.have.status(200);
      const result = JSON.parse(res.text);

      result.length.should.eql(14);     // 14 directives
      result[0].questions.length.should.eql(0);
      SECTION_ID = result[0].id;
      done();
    });
  });

  it(`should get the questions for ${STUDENT_ID} (for a single section)`, (done) => {
    chai.request(server)
    .get(`/middleman/banks/${ALGEBRA_BANK_ID}/sections/${SECTION_ID}/questions`)
    .set('x-fbw-username', STUDENT_ID)
    .end((err, res) => {
      res.should.have.status(200);
      const result = JSON.parse(res.text);

      result.length.should.eql(3);     // 3 questions for the 1st directive

      done();
    });
  });

  function cleanUpPromise(username) {
    // console.log('cleaning up for', username);
    let privateBank;
    // to clean up, need to grab the actual private bank id
    return chai.request(server)
    .get(`/middleman/banks/${utilities.generatePrivateAlias(username)}`)
    .then((res) => {
      res.should.have.status(200);
      privateBank = JSON.parse(res.text);

      // then delete just this user's taken...
      return chai.request(server)
      .get(`/middleman/banks/${privateBank.id}/missions/${MISSION_ID}/takens`);
    })
    .then((res) => {
      res.should.have.status(200);
      const takens = JSON.parse(res.text);
      const myTaken = _.find(takens, taken => (
        taken.takingAgentId.indexOf(dblEncodedUsername(username)) >= 0
      ));
      return chai.request(server)
      .delete(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${MISSION_ID}/takens/${myTaken.id}`);
    })
    .then(() => (
      chai.request(server)
      .delete(`/middleman/banks/${privateBank.id}`)
    ))
    .then((res) => {
      res.should.have.status(200);

      return chai.request(server)
      .delete('/middleman/authorizations')
      .set('x-fbw-username', username);
    })
    .then((res) => {
      res.should.have.status(200);
      return Q.when('');
    })
    .catch(() => {
      // console.log(err)
    });
  }

  after((done) => {
    Q.when(cleanUpPromise(STUDENT_ID))
    .then(() => (
      // console.log('cleaned up for all newly created students');
      done()
    ));
  });
});
