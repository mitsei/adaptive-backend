import AUTHORIZATIONS from './_sampleAuthorizations';

const moment = require('moment');
const _ = require('lodash');

function authz(username) {
  return _.map(AUTHORIZATIONS, (authorization) => {
    const newAuthz = _.assign({}, authorization);
    newAuthz.agentId = username;
    return newAuthz;
  });
}

function momentToQBank(momentObject) {
  const timeUTC = momentObject.utc().toObject();

  return {
    year: timeUTC.years,
    month: timeUTC.months + 1,
    day: timeUTC.date,
    hour: timeUTC.hours,
    minute: timeUTC.minutes,
    second: timeUTC.seconds
  };
}

function parseUsername(username) {
  return username.split('@')[0];
}

const ALGEBRA_BANK_ID = 'assessment.Bank%3A576d6d3271e4828c441d721a%40bazzim.MIT.EDU';
const ACCOUNTING_BANK_ID = 'assessment.Bank%3A57d70ed471e482a74879349a%40bazzim.MIT.EDU';

const ALGEBRA_LIBRARY_ID = 'assessment.Bank%3A57279fb9e7dde086d01b93ef%40bazzim.MIT.EDU';

module.exports = {
  ALGEBRA_BANK_ID,
  ACCOUNTING_BANK_ID,
  momentToQBank,
  authz,
  timeout: function timeout() {
    return _.random(1, 500);
  },
  generatePrivateAlias: function generatePrivateAlias(username) {
    const cleanUsername = username.replace('@', '.').replace(' ', '-');
    return `assessment.Bank%3A576d6d3271e4828c441d721a-${cleanUsername}%40ODL.MIT.EDU`;
  },

  createMission: function createMission(missionData, type, directives, directivesItemsMap) {
    const missionParams = {
      displayName: missionData.displayName,
      startTime: momentToQBank(moment()),
      deadline: momentToQBank(moment().add(30, 'days')),
      sections: _.map(directives, (directive) => {
        const outcomeId = directive.id;
        const numItems = directivesItemsMap[outcomeId];

        return {
          type: 'assessment-part-genus-type%3Afbw-specify-lo%40ODL.MIT.EDU',
          learningObjectiveId: outcomeId,
          quota: Math.floor(numItems / 2) || 1,
          waypointQuota: 1,
          itemBankId: ALGEBRA_LIBRARY_ID,
          minimumProficiency: (Math.floor(numItems / 4) || 1).toString()
        };
      })
    };

    if (type === 'phaseI') {
      missionParams.displayName = missionData.displayName;
      missionParams.genusTypeId = 'assessment-genus%3Afbw-homework-mission%40ODL.MIT.EDU';
      missionParams.recordTypeIds = ['assessment-record-type%3Afbw-phase-i%40ODL.MIT.EDU'];

    } else if (type === 'phaseII') {
      missionParams.username = missionData.student.agentId;
      missionParams.sourceAssessmentTakenId = missionData.student.takenId;
      missionParams.displayName = `${parseUsername(missionData.student.agentId)}'s Phase II for ${missionData.displayName}`;

      missionParams.genusTypeId = 'assessment-genus%3Afbw-in-class-mission%40ODL.MIT.EDU';
      missionParams.recordTypeIds = ['assessment-record-type%3Afbw-phase-ii%40ODL.MIT.EDU'];
    }

    return missionParams;

  }
};
