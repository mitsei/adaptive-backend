let credentials = require('../credentials');
let qbank = require('../lib/qBankFetch')(credentials);

/**
  get the takens given an assessment offered
*/
module.exports = function _getTakens(offeredId, bankId) {
  if (!offeredId || !bankId) return null;

  let options = {
    path: `assessment/banks/${bankId}/assessmentsoffered/${offeredId}/assessmentstaken?raw`
  };

  return qbank(options);
}
