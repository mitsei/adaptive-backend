
let credentials = require('../credentials');
let qbank = require('../lib/qBankFetch')(credentials);

/**
  get the takens given an assessment offered
*/
module.exports = function _deleteOffered(offeredId, bankId) {
  if (!offeredId || !bankId) return null;

  let options = {
    method: 'DELETE',
    path: `assessment/banks/${bankId}/assessmentsoffered/${offeredId}`
  };

  return qbank(options);
}
