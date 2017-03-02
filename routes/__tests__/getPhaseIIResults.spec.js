
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

const Q = require('q');

if (!global.Promise) {
  global.Promise = Q;
}
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../index');

chai.should();
chai.use(chaiHttp);

const MAT_BANK_ID = 'assessment.Bank%3A58498ccb71e482e47e0ed8ce%40bazzim.MIT.EDU';
const TEST_MISSION_ID = 'assessment.AssessmentOffered%3A58768d4271e48263fb04feb8%40bazzim.MIT.EDU';

describe('Phase II results', () => {

  it('should return Phase II results for the College Algebra test mission', (done) => {
    chai.request(server)
    .get(`/middleman/banks/${MAT_BANK_ID}/offereds/${TEST_MISSION_ID}/p2results`)
    .end((err, res) => {
      res.should.have.status(200);
      const result = JSON.parse(res.text);

      result.should.be.a('array');

      done();
    });
  });
});
