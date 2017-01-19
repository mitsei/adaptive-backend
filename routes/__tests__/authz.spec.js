
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

let privateBankId

chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';
const ACCOUNTING_BANK_ID = 'assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU';

const STUDENT_ID = 'tester@fbw-visitor.edu'

import AUTHORIZATIONS from './_sampleAuthorizations'

describe('authorization endpoints', function() {

  // test setting authorizations in bulk
  it(`should set authorizations in bulk for ${STUDENT_ID}`, done => {
    chai.request(server)
    .post(`/middleman/authorizations`)
    .send({
      bulk: AUTHORIZATIONS
    })
    .then((res) => {
      res.should.have.status(200);
      let result = JSON.parse(res.text);

      result.length.should.eql(AUTHORIZATIONS.length);

      // set up private bank id so we can get missions as the student
      // and those authorizations are also added in
      return chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/privatebankid`)
      .set('x-fbw-username', STUDENT_ID)
    })
    .then((res) => {
      privateBankId = res.text
      console.log("private bank id", privateBankId)
      return chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
      .set('x-fbw-username', STUDENT_ID)
    })
    .then((res) => {
      res.should.have.status(200)
      let result = JSON.parse(res.text)
      result.length.should.be.above(0)
      done();
    })
    .catch((err) => {
      done()
    });
  });

  it(`should delete authorizations given username ${STUDENT_ID}`, done => {
    chai.request(server)
   .delete(`/middleman/authorizations`)
   .set('x-fbw-username', STUDENT_ID)
   .then((res) => {
     res.should.have.status(200);

     return chai.request(server)
     .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
     .set('x-fbw-username', STUDENT_ID)
   })
   .then((res) => {
     res.should.have.status(500)
     done()
   })
   .catch((err) => {
     console.log('cannot get missions, yay!')
     done();
   })
  })

  // clean up all the newly-created Phase II missions and early cruft with no offereds
  after( function(done) {
    chai.request(server)
    .delete(`/middleman/banks/${privateBankId}`)
    .end( (err, res) => {
      res.should.have.status(200);
      done()
    })
  });

});
