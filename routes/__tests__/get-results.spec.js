
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
const utilities = require('./utilities')

chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';
const ACCOUNTING_BANK_ID = 'assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU';

const ASSIGNED_BANK_ID = "assessment.Bank%3A581a39cd71e4822fa62c96cd%40bazzim.MIT.EDU";
const OFFERED_ID = "assessment.AssessmentOffered%3A5855473871e4823bce25a7fd%40bazzim.MIT.EDU";    // the internal test mission
const SECTION_ID = "assessment.AssessmentSection%3A5855518171e4823bce25aa7f%40bazzim.MIT.EDU";    // the first directive: if two lines are parallel

const STUDENT_ID = 'LUWEEZY@acc.edu'
const INSTRUCTOR_ID = 'I5055010092@acc.edu'

const STUDENTS = [
  {
    agentId: 'LUWEEZY@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DARTH_VADER@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'YODA@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DAX@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'JANEWAY@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'PICARD@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'SPOCK@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'WORF@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DATA@acc.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'TUVOK@acc.edu',
    takenId: 'a random string'
  },
];

const directives = [
  {
    id: 'mc3-objective%3A15206%40MIT-OEIT'    // add/subtract/multiply 2 functions
  },
  {
    id: 'mc3-objective%3A15143%40MIT-OEIT'    // decompose a function
  },
  {
    id: 'mc3-objective%3A14229%40MIT-OEIT'    // find center and radius of circle
  },
  {
    id: 'mc3-objective%3A15027%40MIT-OEIT',   // find midpoint of segement
  },
  {
    id: 'mc3-objective%3A15119%40MIT-OEIT'  // find the zero of linear funciton
  },
  {
    id: 'mc3-objective%3A15115%40MIT-OEIT'    // solve linear equ
  },
  {
    id: 'mc3-objective%3A15058%40MIT-OEIT'    // find eqn of line given two points
  },
  {
    id: 'mc3-objective%3A14239%40MIT-OEIT'      // find the equation of line from its graph
  }
];

const directivesItemsMap = {
  'mc3-objective%3A15059%40MIT-OEIT': 6,
  'mc3-objective%3A15062%40MIT-OEIT': 6,
  'mc3-objective%3A15206%40MIT-OEIT': 6,
  'mc3-objective%3A15143%40MIT-OEIT': 3,
  'mc3-objective%3A14229%40MIT-OEIT': 6,
  'mc3-objective%3A15027%40MIT-OEIT': 6,
  'mc3-objective%3A15119%40MIT-OEIT': 6,
  'mc3-objective%3A15115%40MIT-OEIT': 6,
  'mc3-objective%3A15058%40MIT-OEIT': 6,
  'mc3-objective%3A14239%40MIT-OEIT': 6,
}


describe('Instructor getting results', function() {

  it(`should get results on the Internal Test Mission (Phase I)`, done => {
    chai.request(server)
   .get(`/middleman/banks/${ALGEBRA_BANK_ID}/offereds/${OFFERED_ID}/results`)
   .end((err, res) => {
     res.should.have.status(200);
     let result = JSON.parse(res.text);
     result.length.should.be.above(1);        // there's 1 taken just from testing alone + possibly a bunch of others
    //  console.log(result);

     done();
   });
  });

  it (`should create Phase II missions for the Internal Test Mission `, done => {
    let phaseIIMissions = _.map(STUDENTS, student => {
      let data = {
        student,
        displayName: 'Internal Test mission'
      };

      // this says that all students listed will get the same directives
      return utilities.createMission(data, 'phaseII', directives, directivesItemsMap)
    });

    chai.request(server)
    .post(`/middleman/banks/${ALGEBRA_BANK_ID}/personalmissions`)
    .send(phaseIIMissions)
    .end((err, res) => {
      res.should.have.status(200);
      let result = JSON.parse(res.text);
      result.length.should.be.above(1);        // there's 1 taken just from testing alone + possibly a bunch of others
      //  console.log(result);

      done();
    });

  });


  // it(`should get results on non-empty Phase II missions`)
  //
  // it(`should get results on empty Phase II missions`)


});
