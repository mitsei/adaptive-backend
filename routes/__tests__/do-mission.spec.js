
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
const ASSIGNED_BANK_ID = "assessment.Bank%3A581a39cd71e4822fa62c96cd%40bazzim.MIT.EDU";
const OFFERED_ID = "assessment.AssessmentOffered%3A5855473871e4823bce25a7fd%40bazzim.MIT.EDU";    // the internal test mission
const SECTION_ID = "assessment.AssessmentSection%3A5855518171e4823bce25aa7f%40bazzim.MIT.EDU";    // the first directive
const QUESTION_ID = "";

describe('student does Mission', function() {

  let questionId;

  // test GET the user's mission, e.g. get a Taken
  it(`should get a taken for ${STUDENT_ID} on /middleman/banks/${ASSIGNED_BANK_ID}/offereds/${OFFERED_ID}/takeMission GET`, done => {
    chai.request(server)
   .get(`/middleman/banks/${ASSIGNED_BANK_ID}/offereds/${OFFERED_ID}/takeMission`)
   .set('x-fbw-username', STUDENT_ID)
   .end((err, res) => {
     res.should.have.status(200);
     let result = JSON.parse(res.text);

     result.length.should.eql(14);     // 14 directives
     let section = result[0];

    //  console.log('section', section);

     done();
   });
  });

  it(`should get the questions for section ${SECTION_ID} on /banks/${ASSIGNED_BANK_ID}/sections/${SECTION_ID}/questions GET`, done => {
    chai.request(server)
   .get(`/banks/${ASSIGNED_BANK_ID}/sections/${SECTION_ID}/questions`)
   .set('x-fbw-username', STUDENT_ID)
   .end((err, res) => {
     res.should.have.status(200);
     let result = JSON.parse(res.text);
    //  console.log('result', result);

     result.length.should.eql(3);     // 3 questions for the 1st directive
     let question = result[0];
    //  questionId = question.id;

    //  console.log('questionId', questionId)

     done();
   });
  })

  it(`should submit a wrong answer on /middleman/assessment/banks/${ASSIGNED_BANK_ID}/assessmentstaken/${SECTION_ID}/questions/${QUESTION_ID}/submit POST`, done => {
    chai.request(server)
   .post(`/middleman/assessment/banks/${ASSIGNED_BANK_ID}/assessmentstaken/${SECTION_ID}/questions/${QUESTION_ID}/submit`)
   .set('x-fbw-username', STUDENT_ID)
   .send({
     choiceIds: [choiceId],
     type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
   })
   .end((err, res) => {
     res.should.have.status(200);

     let result = JSON.parse(res.text);
    //  console.log(result);

     done();
   });
  });

  it(`should submit the correct answer on /middleman/assessment/banks/${ASSIGNED_BANK_ID}/assessmentstaken/${SECTION_ID}/questions/${QUESTION_ID}/submit POST`);

});
