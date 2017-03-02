
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

const chai = require('chai');
const chaiHttp = require('chai-http');
const moment = require('moment');
const server = require('../../index');
const _ = require('lodash');

chai.should();
chai.use(chaiHttp);

const utilities = require('./utilities');

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';

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
  }
];

const DIRECTIVE_TO_REMOVE = 'mc3-objective%3A15058%40MIT-OEIT';   // find eqn of line given two points
const NEW_DIRECTIVE_ID = 'mc3-objective%3A14239%40MIT-OEIT';      // find the equation of line from its graph

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
  'mc3-objective%3A14239%40MIT-OEIT': 6
};

let MISSION;

describe('instructor', () => {

  it('should be able to create a new phase I mission', (done) => {
    const mission = utilities.createMission({ displayName: 'Test Phase I' },
      'phaseI', directives, directivesItemsMap);

    chai.request(server)
    .post(`/middleman/banks/${ALGEBRA_BANK_ID}/missions`)
    .send(mission)
    .end((err, res) => {
      res.should.have.status(200);
      MISSION = JSON.parse(res.text);
      MISSION.childIds.length.should.eql(directives.length);
      done();
    });
  });

  it('should be able to update the spawned flag', (done) => {
    const parameters = {
      hasSpawnedFollowOnPhase: true
    };
    chai.request(server)
    .put(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${MISSION.id}`)
    .send(parameters)
    .end((err, res) => {
      res.should.have.status(200);
      const mission = JSON.parse(res.text);

      mission.childIds.length.should.eql(MISSION.childIds.length);
      mission.childIds.should.eql(MISSION.childIds);

      MISSION.hasSpawnedFollowOnPhase.should.eql(false);
      mission.hasSpawnedFollowOnPhase.should.eql(true);
      done();
    });
  });

  it('should be able to get the mission sections', (done) => {
    chai.request(server)
    .get(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${MISSION.id}`)
    .end((err, res) => {
      res.should.have.status(200);
      const missionWithSections = JSON.parse(res.text);
      missionWithSections.sections.length.should.eql(directives.length);
      missionWithSections.assignedBankIds[0].should.not.eql(ALGEBRA_BANK_ID);
      const sectionLOs = _.map(missionWithSections.sections, 'learningObjectiveId');
      sectionLOs.should.eql(_.map(directives, 'id'));
      done();
    });
  });

  it('should be able to remove directives from an existing mission', (done) => {
    const updatedDirectives = _.filter(directives, directive => (
      directive.id !== DIRECTIVE_TO_REMOVE
    ));

    const updatedMission = utilities.createMission({ displayName: 'Test Phase I' },
      'phaseI', updatedDirectives, directivesItemsMap);
    updatedMission.assessmentOfferedId = MISSION.assessmentOfferedId;
    chai.request(server)
    .put(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${MISSION.id}`)
    .send(updatedMission)
    .end((err, res) => {
      res.should.have.status(200);
      const mission = JSON.parse(res.text);

      mission.childIds.length.should.eql(directives.length - 1);
      // because server side it's a full replace of items
      mission.childIds.should.not.eql(MISSION.childIds);

      const sectionLOs = _.map(mission.sections, 'learningObjectiveId');
      sectionLOs.should.not.include(DIRECTIVE_TO_REMOVE);
      done();
    });
  });

  it('should be able to edit the mission name', (done) => {
    const newName = 'My new mission name';
    newName.should.not.eql(MISSION.displayName.text);
    const updatedMission = utilities.createMission({ displayName: newName },
      'phaseI', directives, directivesItemsMap);
    updatedMission.assessmentOfferedId = MISSION.assessmentOfferedId;
    chai.request(server)
    .put(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${MISSION.id}`)
    .send(updatedMission)
    .end((err, res) => {
      res.should.have.status(200);
      const mission = JSON.parse(res.text);

      mission.childIds.length.should.eql(directives.length);
      // because server side it's a full replace of items
      mission.childIds.should.not.eql(MISSION.childIds);
      const sectionLOs = _.map(mission.sections, 'learningObjectiveId');
      sectionLOs.should.eql(_.map(directives, 'id'));

      mission.displayName.text.should.eql(newName);
      done();
    });
  });

  it('should be able to change the mission dates', (done) => {
    const newStartTime = utilities.momentToQBank(moment().add(1, 'years'));
    const newDeadline = utilities.momentToQBank(moment().add({ years: 1, days: 30 }));

    const updatedMission = utilities.createMission({ displayName: 'Test Phase I' },
      'phaseI', directives, directivesItemsMap);
    updatedMission.assessmentOfferedId = MISSION.assessmentOfferedId;
    updatedMission.startTime = newStartTime;
    updatedMission.deadline = newDeadline;

    chai.request(server)
    .put(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${MISSION.id}`)
    .send(updatedMission)
    .end((err, res) => {
      res.should.have.status(200);
      const mission = JSON.parse(res.text);

      mission.startTime.year.should.not.eql(MISSION.startTime.year);
      mission.deadline.year.should.not.eql(MISSION.deadline.year);
      done();
    });
  });

  it('should be able to add new directives', (done) => {
    const updatedDirectives = _.assign([], directives);
    updatedDirectives.push({
      id: NEW_DIRECTIVE_ID
    });

    const updatedMission = utilities.createMission({ displayName: 'Test Phase I' },
      'phaseI', updatedDirectives, directivesItemsMap);
    updatedMission.assessmentOfferedId = MISSION.assessmentOfferedId;
    chai.request(server)
    .put(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${MISSION.id}`)
    .send(updatedMission)
    .end((err, res) => {
      res.should.have.status(200);
      const mission = JSON.parse(res.text);

      mission.childIds.length.should.eql(updatedDirectives.length);
      // because server side it's a full replace of items
      mission.childIds.should.not.eql(MISSION.childIds);
      const sectionLOs = _.map(mission.sections, 'learningObjectiveId');
      sectionLOs.should.include(NEW_DIRECTIVE_ID);
      done();
    });
  });

  // clean up the newly-created mission
  after((done) => {
    chai.request(server)
    .delete(`/middleman/banks/${ALGEBRA_BANK_ID}/missions/${MISSION.id}`)
    .end((err, res) => {
      res.should.have.status(200);
      done();
    });
  });
});
