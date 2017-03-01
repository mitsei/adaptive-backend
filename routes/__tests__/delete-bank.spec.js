import AUTHORIZATIONS from './_sampleAuthorizations';

process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

// const env = require('./environment');

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../index');
const _ = require('lodash');

chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';

const STUDENT_ID = 'tester@fbw-visitor.edu';

let privateBankId;

describe('delete bank', () => {

  it('should remove the bank and remove it from the hierarchy', (done) => {
    // create basic authz
    chai.request(server)
    .post('/middleman/authorizations')
    .send({
      bulk: AUTHORIZATIONS
    })
    .then((res) => {
      res.should.have.status(200);
      // generate the bank via /privatebankid
      return chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/privatebankid`)
      .set('x-fbw-username', STUDENT_ID);
    })
    .then((res) => {
      res.should.have.status(200);
      privateBankId = res.text;

      return chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
      .set('x-fbw-username', STUDENT_ID);
    })
    .then((res) => {
      res.should.have.status(200);
      const result = JSON.parse(res.text);
      result.length.should.be.above(0);

      // then delete the private bank
      return chai.request(server)
      .delete(`/middleman/banks/${privateBankId}`);
    })
    .then((res) => {
      res.should.have.status(200);

      // verify the bank is gone
      return chai.request(server)
      .get(`/middleman/banks/${privateBankId}`);
    })
    .then((res) => {
      res.should.not.have.status(200);
    })
    .catch(() => (
      // verify that it isn't listed in children of the ALGEBRA_BANK_ID
      chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/children`)
    ))
    .then((res) => {
      res.should.have.status(200);
      const result = JSON.parse(res.text).data.results;
      const childrenIds = _.map(result, 'id');
      childrenIds.should.not.include(privateBankId);

      done();
    })
    .catch(() => {
      done();
    });
  });

  // clean up all the newly-created authorizations
  after((done) => {
    chai.request(server)
    .delete('/middleman/authorizations')
    .set('x-fbw-username', STUDENT_ID)
    .end((err, res) => {
      res.should.have.status(200);
      done();
    });
  });

});
