
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

const ASSIGNED_BANK_ID = "assessment.Bank%3A581a39cd71e4822fa62c96cd%40bazzim.MIT.EDU";
const SECTION_ID = "assessment_authoring.AssessmentPart%3A5855473871e4823bce25a7d9%40bazzim.MIT.EDU";
const OFFERED_ID = "assessment.AssessmentOffered%3A5855473871e4823bce25a7fd%40bazzim.MIT.EDU";

const STUDENT_ID = 'LUWEEZY'


describe('student does Mission', function() {
  // test GET the user's mission, e.g. get a Taken
  let takenId, questionId, choiceId;
  it(`should get a taken for ${STUDENT_ID} on /middleman/banks/${ASSIGNED_BANK_ID}/offereds/${OFFERED_ID}/takeMission GET`, done => {
    chai.request(server)
   .get(`/middleman/banks/${ASSIGNED_BANK_ID}/offereds/${OFFERED_ID}/takeMission`)
   .set('x-fbw-username', STUDENT_ID)
   .end((err, res) => {
     res.should.have.status(200);

     let result = JSON.parse(res.text);
     console.log(result);

     takenId = result.id;

     done();
   });
  });

  // test submitting a wrong answer with the taken just obtained
  it(`should submit a wrong answer on /middleman/assessment/banks/${ASSIGNED_BANK_ID}/assessmentstaken/${takenId}/questions/${questionId}/submit POST`, done => {
    chai.request(server)
   .post(`/middleman/assessment/banks/${ASSIGNED_BANK_ID}/assessmentstaken/${takenId}/questions/${questionId}/submit`)
   .set('x-fbw-username', STUDENT_ID)
   .send({
     choiceIds: [choiceId],
     type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
   })
   .end((err, res) => {
     res.should.have.status(200);

     let result = JSON.parse(res.text);
     console.log(result);

     done();
   });
  });

  it(`should submit the correct answer on /middleman/assessment/banks/${ASSIGNED_BANK_ID}/assessmentstaken/${takenId}/questions/${questionId}/submit POST`);

});
