
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

function momentToQBank(momentObject) {
  let timeUTC = momentObject.utc().toObject();

  return {
    year: timeUTC.years,
    month: timeUTC.months + 1,
    day: timeUTC.date,
    hour: timeUTC.hours,
    minute: timeUTC.minutes,
    second: timeUTC.seconds
  }
}


const directives = [
  {
    id: 'mc3-objective%3A15059%40MIT-OEIT',     // determine if 2 lines are parallel
  },
  {
    id: 'mc3-objective%3A15062%40MIT-OEIT',   // ditto, perpendicular
  },
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

const dummy_mission_post = {
  displayName: 'npm test mission',
  genusTypeId: "assessment-genus%3Afbw-homework-mission%40ODL.MIT.EDU",
  startTime: momentToQBank(moment()),
  deadline: momentToQBank(moment().add(30, 'days')),
  recordTypeIds: ["assessment-record-type%3Afbw-phase-i%40ODL.MIT.EDU"],
  sections: _.map(directives, (directive) => {
    let outcomeId = directive.id,
      numItems = directivesItemsMap[outcomeId];

    return {
      type: "assessment-part-genus-type%3Afbw-specify-lo%40ODL.MIT.EDU",
      learningObjectiveId: outcomeId,
      quota: Math.floor(numItems / 2) || 1,
      waypointQuota: 1,
      itemBankId: ALGEBRA_BANK_ID,
      minimumProficiency: (Math.floor(numItems / 4) || 1).toString()
    }
  })
};

// console.log('dummy_mission_post', dummy_mission_post)


describe('Missions', function() {

  // test GET algebra
  it('should get a list of hardcoded-Algebra missions ', done => {
    chai.request(server)
   .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
   .end((err, res) => {
     let result = JSON.parse(res.text);
    //  console.log(result);
     (result).length.should.eql(5);

    //  _.forEach(result, mission => {
    //    mission.startTime.should.have('number');
    //  });

     done();
   });
  });

  // test GET accounting
  it('should get a list of hardcoded-Accounting missions', done => {
    chai.request(server)
   .get(`/middleman/banks/${ACCOUNTING_BANK_ID}/missions`)
   .end((err, res) => {
     let result = JSON.parse(res.text);
    //  console.log('result for account', result)

     (result).length.should.eql(5);

     done();
   });
  });

  // test POST on algebra missions
  let postMissionId, assessmentOfferedId;
  it('should create a new Phase I mission', done => {

    chai.request(server)
   .post(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
   .send(dummy_mission_post)
   .end((err, res) => {
    //  console.log(res.res);
     res.should.have.status(200);
     let result = JSON.parse(res.text);
    //  console.log('result', result);

     result.displayName.text.should.eql('npm test mission')
     postMissionId = result.id;
     assessmentOfferedId = result.assessmentOfferedId;

    //  console.log('postMissionId', postMissionId)
    //  console.log('assessmentOfferedId', assessmentOfferedId)

     done();
   });
  });

  // test DELETE on algebra missions
  // technically we should do this in an 'after' block, but since this is so slow, we're fine
  // after(function(outerDone) {
    it('should delete the recently-created mission', done => {

      chai.request(server)
     .delete(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${postMissionId}`)
     .end((err, res) => {
      //  console.log('res.text', res.text)
       res.should.have.status(200);

       done();
      //  outerDone();
     });
    });
  // })


});
