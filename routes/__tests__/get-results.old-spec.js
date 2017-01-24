
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

// const env = require('./environment');
const Q = require('q')
if (!global.Promise) {
  global.Promise = require('q');
}
const chai = require('chai');
const chaiHttp = require('chai-http');
const moment = require('moment')
const server = require('../../index');
const should = chai.should();
const _ = require('lodash')
const utilities = require('./utilities')

chai.use(chaiHttp);

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';
const ACCOUNTING_BANK_ID = 'assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU';

const ASSIGNED_BANK_ID = "assessment.Bank%3A581a39cd71e4822fa62c96cd%40bazzim.MIT.EDU";
const OFFERED_ID = "assessment.AssessmentOffered%3A5855473871e4823bce25a7fd%40bazzim.MIT.EDU";    // the internal test mission
const SECTION_ID = "assessment.AssessmentSection%3A5855518171e4823bce25aa7f%40bazzim.MIT.EDU";    // the first directive: if two lines are parallel

const STUDENT_ID = 'LUWEEZY@fbw-visitor.edu'
const INSTRUCTOR_ID = 'I5055010092@fbw-visitor.edu'

const STUDENTS = [
  {
    agentId: 'LUWEEZY@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DARTH_VADER@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'YODA@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DAX@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'JANEWAY@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'PICARD@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'SPOCK@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'WORF@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'DATA@fbw-visitor.edu',
    takenId: 'a random string'
  },
  {
    agentId: 'TUVOK@fbw-visitor.edu',
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
  this.timeout(6000000)

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
      result.length.should.be.eql(STUDENTS.length);
      // console.log('result', result);

      done();
    });
  });

  function getOfferedTakenPromise(student) {
    // this executes only after a random timeout between 500 milliseconds and 2 seconds
    let deferred = Q.defer();
    let randomTimeout = _.random(500, 1000*2)

    setTimeout(() => {
      console.log('getting offered + taken for', student.agentId, 'after', randomTimeout)

      chai.request(server)
      .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
      .set('x-fbw-username', student.agentId)
      .then( (res) => {
        res.should.have.status(200);

        let result = JSON.parse(res.text);
        let phaseIIs = _.filter(result, mission => mission.displayName.text.indexOf('Phase II') > -1);
        // console.log('all missions', result)
        // console.log('phaseIIs', phaseIIs);

        phaseIIs.length.should.be.eql(1);           // since we do cleanup for everyone, there should only be 1 mission

        let offereds = phaseIIs[0].offereds;
        let assignedBankIds = phaseIIs[0].assignedBankIds;

        // console.log('offereds', offereds))
        // console.log('offereds length', offereds.length)
        // console.log('assignedBankIds', assignedBankIds)

        offereds.length.should.be.eql(1);
        assignedBankIds.length.should.be.eql(1);

        return chai.request(server)
         .get(`/middleman/banks/${ALGEBRA_BANK_ID}/offereds/${offereds[0].id}/takeMission`)
         .set('x-fbw-username', student.agentId)
      })
      .then( res => {
        let result = JSON.parse(res.text);
        // console.log('got taken', result);
        // this should return a list of sections
        result.length.should.eql(directives.length);     // 14 directives

        deferred.resolve(result);

        return result;
      });
    }, randomTimeout);

    return deferred.promise;
  }


  it(`should verify that all students can get the offered id and take their own Phase II mission`, function(done) {
    this.timeout(300000)

    Q.all(_.map(STUDENTS, getOfferedTakenPromise))
    .then( res => {
      // console.log('got offereds + takens for all students', res)
      done();
    })

  })


  function deleteMissionAsync(missionId) {
    return chai.request(server)
     .delete(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${missionId}`)
     .then((res) => {
      //  console.log('delete res', res.text)
       return res.text ? JSON.parse(res.text) : null;
     });
  }

  function cleanUpPromise(student) {
    console.log('cleaning up for', student.agentId);

    return chai.request(server)
    .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
    .set('x-fbw-username', student.agentId)
    .then( (res) => {
      res.should.have.status(200);

      let result = JSON.parse(res.text);
      let phaseIIs = _.filter(result, mission => mission.displayName.text.indexOf('Phase II') > -1 || mission.offereds.length == 0);
      // console.log('all missions', result);
      // console.log(result[0].displayName);

      // console.log('missions to be deleted', _.map(phaseIIs, 'displayName.text'));

      return Q.all(_.map(phaseIIs, mission => deleteMissionAsync(mission.id)))
    })
    .then( res => res)
    .catch( err => err);
  }

  // clean up all the newly-created Phase II missions and early cruft with no offereds
  after( function(done) {
    this.timeout(20000);

    Q.all(_.map(STUDENTS, cleanUpPromise))
    .then( res => {
      console.log('cleaned up for all students', res.text);

      done();
    })
  });



});
