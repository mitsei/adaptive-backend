let qbank = require('../lib/qBankFetch')(credentials);

/**
  get the takens given an assessment offered
*/
module.exports = function _getTakens(missionId, bankId) {
  let getOfferedsOptions = {
    path: `assessment/banks/${bankId}/assessments/${missionId}/assessmentsoffered?raw`
  }

  return qbank(options);
}
