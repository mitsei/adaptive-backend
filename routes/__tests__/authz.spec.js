import AUTHORIZATIONS from './_sampleAuthorizations';

process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../index');

let privateBankId;

chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';

const STUDENT_ID = 'tester@fbw-visitor.edu';

describe('authorization endpoints', () => {

  // test setting authorizations in bulk
  it(`should set authorizations in bulk for ${STUDENT_ID}`, (done) => {
    chai.request(server)
    .post('/middleman/authorizations')
    .send({
      bulk: AUTHORIZATIONS
    })
    .then((res) => {
      res.should.have.status(200);
      const result = JSON.parse(res.text);

      result.length.should.eql(AUTHORIZATIONS.length);

      return chai.request(server)
      .get('/middleman/hasbasicauthz')
      .set('x-fbw-username', STUDENT_ID);
    })
    .then((res) => {
      res.should.have.status(200);

      // set up private bank id so we can get missions as the student
      // and those authorizations are also added in
      return chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/privatebankid`)
      .set('x-fbw-username', STUDENT_ID);
    })
    .then((res) => {
      privateBankId = res.text;
      return chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
      .set('x-fbw-username', STUDENT_ID);
    })
    .then((res) => {
      res.should.have.status(200);
      const result = JSON.parse(res.text);
      result.length.should.be.above(0);
      done();
    })
    .catch(() => {
      // console.log(err)
    });
  });

  it(`should delete authorizations given username ${STUDENT_ID}`, (done) => {
    chai.request(server)
    .delete('/middleman/authorizations')
    .set('x-fbw-username', STUDENT_ID)
    .then((res) => {
      res.should.have.status(200);

      return chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
      .set('x-fbw-username', STUDENT_ID);
    })
    .then((res) => {
      res.should.have.status(500);
      done();
    })
    .catch(() => {
      // console.log('cannot get missions, yay!')
      done();
    });
  });

  // clean up all the newly-created Phase II missions and early cruft with no offereds
  after((done) => {
    chai.request(server)
    .delete(`/middleman/banks/${privateBankId}`)
    .end((err, res) => {
      res.should.have.status(200);
      done();
    });
  });
});
