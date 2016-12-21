
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
const SECTION_ID = "assessment.AssessmentSection%3A5855518171e4823bce25aa7f%40bazzim.MIT.EDU";    // the first directive: if two lines are parallel

const WRONG_QUESTION_ID = "assessment.Item%3A5855518571e4823bce25aa8f%40assessment-session";
const WRONG_CHOICE_ID = "583f570271e482974e517c72";

const CORRECT_QUESTION_ID = "assessment.Item%3A5855518471e4823bce25aa8d%40assessment-session";
const CORRECT_CHOICE_ID = "582f1e5571e4822a2a0589d0";


describe('student doing a Mission', function() {

  let questionId;

  // test GET the user's mission, e.g. get a Taken
  it(`should get a taken for ${STUDENT_ID}`, done => {
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

  it(`should get the questions for ${STUDENT_ID} (an existing student)`, done => {
    chai.request(server)
   .get(`/middleman/banks/${ASSIGNED_BANK_ID}/sections/${SECTION_ID}/questions`)
   .set('x-fbw-username', STUDENT_ID)
   .end((err, res) => {
     res.should.have.status(200);
     let result = JSON.parse(res.text);
    //  console.log('questions', result);

     result.length.should.eql(4);     // 3 questions for the 1st directive + 1 Waypoint
     let question = result[0];
    //  questionId = question.id;

    //  console.log('questionId', questionId)
    // console.log('question choices:', question.choices)

     done();
   });
  })


  it(`should submit a wrong answer on the 3rd Target question for ${STUDENT_ID} `, done => {
    chai.request(server)
   .post(`/middleman/banks/${ASSIGNED_BANK_ID}/takens/${SECTION_ID}/questions/${WRONG_QUESTION_ID}/submit`)
   .set('x-fbw-username', STUDENT_ID)
   .send({
     choiceIds: [WRONG_CHOICE_ID],
     type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
   })
   .end((err, res) => {
     res.should.have.status(200);

     let result = JSON.parse(res.text);
    //  console.log('wrong result', result);
     result.isCorrect.should.eql(false);
     // we answered incorrectly on the 3rd Target, so next Question should be waypoint with 3.1 magic numbering
     result.nextQuestion.displayName.text.should.eql('3.1');

     done();
   });
  });

  it(`should submit the correct answer on the 1st Target quesiton for ${STUDENT_ID}`, done => {
    chai.request(server)
   .post(`/middleman/banks/${ASSIGNED_BANK_ID}/takens/${SECTION_ID}/questions/${CORRECT_QUESTION_ID}/submit`)
   .set('x-fbw-username', STUDENT_ID)
   .send({
     choiceIds: [CORRECT_CHOICE_ID],
     type: 'answer-record-type%3Amulti-choice-with-files-and-feedback%40ODL.MIT.EDU'
   })
   .end((err, res) => {
     res.should.have.status(200);

     let result = JSON.parse(res.text);
     result.isCorrect.should.eql(true);
     result.nextQuestion.displayName.text.should.eql('2');      // we answered correctly on the 1st Target
    //  console.log('correct result', result);

     done();
   });
  });

});
