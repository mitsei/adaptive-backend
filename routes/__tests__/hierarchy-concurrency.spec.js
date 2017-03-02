
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

// const env = require('./environment');

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../index');
const _ = require('lodash');
const Q = require('q');
const utilities = require('./utilities');

chai.should();
chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';

const OFFERED_ID = 'assessment.AssessmentOffered%3A5855473871e4823bce25a7fd%40bazzim.MIT.EDU';    // the internal test mission

const NOW_SECS = new Date().getTime();
const UNIQUE_USERNAMES = [];

const NUM_STUDENTS = 5;

_.each(_.range(NUM_STUDENTS), (inc) => {
  UNIQUE_USERNAMES.push(Math.floor(NOW_SECS + inc).toString());
});
const FAKE_SCHOOL = 'testing';

const STUDENTS = _.map(UNIQUE_USERNAMES, username => (
  `${username}@${FAKE_SCHOOL}.edu`
));

const PRIVATE_BANK_ALIASES = {};

_.each(STUDENTS, (username) => {
  PRIVATE_BANK_ALIASES[username] = utilities.generatePrivateAlias(username);
});

const PRIVATE_BANK_IDS = [];
const TEST_MISSIONS = {};  // used for cleaning up
const TEST_SECTIONS = [];


function privateBankAlias(username) {
  return PRIVATE_BANK_ALIASES[username];
}

function dblEncodedUsername(username) {
  return encodeURIComponent(encodeURIComponent(username));
}


describe('multiple new students interacting', () => {
  function setBasicAuthz(username) {
    const deferred = Q.defer();

    setTimeout(() => {
      chai.request(server)
      .post('/middleman/authorizations')
      .send({
        bulk: utilities.authz(username)
      })
      .then((res) => {
        deferred.resolve(res);
      });
    }, utilities.timeout());

    return deferred.promise;
  }

  function getPrivateBankId(username) {
    // This is the critical method to test, which modifies the
    // hierarchy. So the random timeouts here is most important.
    const deferred = Q.defer();

    setTimeout(() => {
      chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/privatebankid`)
      .set('x-fbw-username', username)
      .then((res) => {
        deferred.resolve(res);
      }, utilities.timeout());
    });

    return deferred.promise;
  }

  it('should each get different private banks', (done) => {
    // set up basic authz first, before calling /privatebankid
    Q.all(_.map(STUDENTS, username => (
      setBasicAuthz(username)
    )))
    .then((results) => {
      _.each(results, (result, index) => {
        const newUserAuthz = JSON.parse(result.text);
        newUserAuthz[0].agentId.should.include(dblEncodedUsername(STUDENTS[index]));
      });

      // now get privateBankIds
      return Q.all(_.map(STUDENTS, username => (
        getPrivateBankId(username)
      )));
    })
    .then((results) => {
      results.length.should.be.eql(NUM_STUDENTS);
      // save the private banks to assert IDs are equal, later
      _.each(results, (res) => {
        PRIVATE_BANK_IDS.push(res.text);
      });

      PRIVATE_BANK_IDS.length.should.be.eql(NUM_STUDENTS);
      PRIVATE_BANK_IDS[0].should.not.be.eql(PRIVATE_BANK_IDS[1]);

      return Q.all(_.map(STUDENTS, username => (
        chai.request(server)
        .get(`/middleman/banks/${privateBankAlias(username)}`)
      )));
    })
    .then((results) => {
      results.length.should.be.eql(NUM_STUDENTS);
      _.each(results, (res, index) => {
        JSON.parse(res.text).id.should.be.eql(PRIVATE_BANK_IDS[index]);
      });

      done();
    })
    .catch(() => {
      // console.log(err);
    });
  });

  it('should each be able to see the shared missions', (done) => {
    Q.all(_.map(STUDENTS, username => (
      chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
      .set('x-fbw-username', username)
    )))
    .then((results) => {
      _.each(results, (res, index) => {
        const missions = JSON.parse(res.text);
        missions.length.should.eql(8);
        TEST_MISSIONS[STUDENTS[index]] = _.find(missions, { assessmentOfferedId: OFFERED_ID });
      });
      done();
    })
    .catch(() => {
      // console.log(err)
    });
  });

  it('should each be able to get questions for a shared mission', (done) => {
    Q.all(_.map(STUDENTS, username => (
      chai.request(server)
        .get(`/middleman/banks/${ALGEBRA_BANK_ID}/offereds/${OFFERED_ID}/takeMission`)
        .set('x-fbw-username', username)
    )))
    .then((results) => {
      _.each(results, (result) => {
        result.should.have.status(200);
        TEST_SECTIONS.push(JSON.parse(result.text)[0]);
      });
      done();
    })
    .catch(() => {
      // console.log(err)
    });
  });

  it('should each be able to submit response for a shared mission', (done) => {
    Q.all(_.map(STUDENTS, (username, index) => {
      const section = TEST_SECTIONS[index];
      const sectionId = section.id;
      const questionId = section.questions[0].id;
      const choiceId = section.questions[0].choices[0].id;
      return chai.request(server)
        .post(`/middleman/banks/${ALGEBRA_BANK_ID}/takens/${sectionId}/questions/${questionId}/submit`)
        .set('x-fbw-username', username)
        .send({
          choiceIds: [choiceId],
          type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
        });
    }))
    .then((results) => {
      _.each(results, (result) => {
        result.should.have.status(200);
      });
      done();
    })
    .catch(() => {
      // console.log(err)
    });
  });

  function cleanUpPromise(username) {
    // console.log('cleaning up for', username);
    let privateBank;
    // to clean up, need to grab the actual private bank id
    return chai.request(server)
    .get(`/middleman/banks/${privateBankAlias(username)}`)
    .then((res) => {
      res.should.have.status(200);
      privateBank = JSON.parse(res.text);

      // then delete just this user's taken...
      return chai.request(server)
      .get(`/middleman/banks/${privateBank.id}/missions/${TEST_MISSIONS[username].id}/takens`);
    })
    .then((res) => {
      res.should.have.status(200);
      const takens = JSON.parse(res.text);
      const myTaken = _.find(takens, taken => (
        taken.takingAgentId.indexOf(dblEncodedUsername(username)) >= 0
      ));
      return chai.request(server)
      .delete(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${TEST_MISSIONS[username].id}/takens/${myTaken.id}`);
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

  // clean up all the newly-created authorizations, banks, and missions
  after((done) => {
    // this.timeout(20000);

    Q.all(_.map(STUDENTS, cleanUpPromise))
    .then(() => (
      // console.log('cleaned up for all newly created students');
      done()
    ));
  });
});
